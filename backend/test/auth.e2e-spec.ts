import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as bcrypt from 'bcryptjs';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthModule } from '../src/modules/auth/auth.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  RefreshToken,
  RefreshTokenSchema,
  RefreshTokenDocument,
} from '../src/modules/auth/models/refresh-token.model';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
  PasswordResetTokenDocument,
} from '../src/common/models/password-reset-token.model';
import { EmailModule } from '../src/common/email/email.module';
import {
  EMAIL_SERVICE,
  IEmailService,
} from '../src/common/email/email.service';

const TEST_EMAIL = 'e2e@example.com';
const TEST_PASSWORD = 'password123';

async function buildApp(
  uri: string,
  throttleLimit: number,
  mockEmail?: IEmailService,
): Promise<{ app: INestApplication<App>; module: TestingModule }> {
  const builder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      MongooseModule.forRoot(uri),
      MongooseModule.forFeature([
        { name: User.name, schema: UserSchema },
        { name: RefreshToken.name, schema: RefreshTokenSchema },
        { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      ]),
      ThrottlerModule.forRoot([{ ttl: 60000, limit: throttleLimit }]),
      PassportModule,
      AuthModule,
      EmailModule,
    ],
    providers: [
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
    ],
  });

  if (mockEmail) {
    builder.overrideProvider(EMAIL_SERVICE).useValue(mockEmail);
  }

  const moduleFixture = await builder.compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  return { app, module: moduleFixture };
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let refreshTokenModel: Model<RefreshTokenDocument>;
  let passwordResetTokenModel: Model<PasswordResetTokenDocument>;
  let mockEmailService: IEmailService;
  let seededUserId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    mockEmailService = { sendPasswordReset: jest.fn() };

    // High limit so regular tests never hit rate limit
    ({ app, module } = await buildApp(uri, 1000, mockEmailService));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    refreshTokenModel = module.get<Model<RefreshTokenDocument>>(
      getModelToken(RefreshToken.name),
    );
    passwordResetTokenModel = module.get<Model<PasswordResetTokenDocument>>(
      getModelToken(PasswordResetToken.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const user = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'E2E',
      lastName: 'User',
      email: TEST_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: null,
    });
    seededUserId = user._id.toString();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await refreshTokenModel.deleteMany({});
    await passwordResetTokenModel.deleteMany({});
    (mockEmailService.sendPasswordReset as jest.Mock).mockClear();
  });

  // ─── POST /auth/login ───────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('valid credentials → 201 with accessToken, refreshToken, and user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(201);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String) as string,
        refreshToken: expect.any(String) as string,
        user: {
          id: seededUserId,
          firstName: 'E2E',
          lastName: 'User',
          role: 'member',
          trainerId: null,
        },
      });
    });

    it('wrong password → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: 'wrongpassword' })
        .expect(401);
    });

    it('unknown email → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: TEST_PASSWORD })
        .expect(401);
    });

    it('malformed body (missing email) → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: TEST_PASSWORD })
        .expect(400);
    });
  });

  // ─── POST /auth/refresh ─────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('valid refresh token → 200 with new accessToken + refreshToken', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(201);

      const { refreshToken } = loginResponse.body as {
        refreshToken: string;
      };

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ userId: seededUserId, refreshToken })
        .expect(200);

      expect(refreshResponse.body).toMatchObject({
        accessToken: expect.any(String) as string,
        refreshToken: expect.any(String) as string,
      });
      const newRefreshToken = (refreshResponse.body as { refreshToken: string })
        .refreshToken;
      expect(newRefreshToken).not.toBe(refreshToken);
    });

    it('replayed (already-consumed) token → 401 and subsequent valid refresh also fails (all revoked)', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(201);

      const { refreshToken } = loginResponse.body as { refreshToken: string };

      // First refresh — consumes the token and issues a new one
      const firstRefresh = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ userId: seededUserId, refreshToken })
        .expect(200);

      const newRefreshToken = (firstRefresh.body as { refreshToken: string })
        .refreshToken;

      // Replay the original (already-deleted) token — triggers revocation of all tokens
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ userId: seededUserId, refreshToken })
        .expect(401);

      // The new token issued by the first refresh is now also revoked
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ userId: seededUserId, refreshToken: newRefreshToken })
        .expect(401);
    });
  });

  // ─── POST /auth/logout ──────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('valid Bearer access token → 200 and refresh token is gone', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(201);

      const { accessToken, refreshToken } = loginResponse.body as {
        accessToken: string;
        refreshToken: string;
      };

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Verify the refresh token is revoked
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ userId: seededUserId, refreshToken })
        .expect(401);
    });

    it('no Bearer token → 401', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });

  // ─── POST /auth/forgot-password ─────────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('known email → 200 and a PasswordResetToken document is created', async () => {
      const countBefore = await passwordResetTokenModel.countDocuments();

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: TEST_EMAIL })
        .expect(200);

      const countAfter = await passwordResetTokenModel.countDocuments();
      expect(countAfter).toBe(countBefore + 1);
    });

    it('unknown email → 200 and no token created (no existence leak)', async () => {
      const countBefore = await passwordResetTokenModel.countDocuments();

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nobody@example.com' })
        .expect(200);

      const countAfter = await passwordResetTokenModel.countDocuments();
      expect(countAfter).toBe(countBefore);
    });

    it('missing email → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);
    });
  });

  // ─── POST /auth/reset-password ──────────────────────────────────────────────

  describe('POST /auth/reset-password', () => {
    it('valid token + matching passwords → 200, user can log in with new password, pre-existing refresh tokens revoked', async () => {
      // Seed a pre-existing refresh token so we can verify it gets revoked
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(201);
      const { refreshToken: existingRefreshToken } = loginResponse.body as {
        refreshToken: string;
      };

      // Trigger forgot-password to get a reset token
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: TEST_EMAIL })
        .expect(200);

      // Extract the raw token from the email service mock call
      const sendSpy = mockEmailService.sendPasswordReset as jest.Mock;
      const firstCall = sendSpy.mock.calls[0] as [string, string];
      const deepLink = firstCall[1];
      const rawToken = new URL(
        deepLink.replace('powergym://', 'http://host/'),
      ).searchParams.get('token');
      expect(rawToken).toBeTruthy();

      const NEW_PASSWORD = 'newpassword456';
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: rawToken, newPassword: NEW_PASSWORD })
        .expect(200);

      // User can now log in with the new password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: NEW_PASSWORD })
        .expect(201);

      // The old refresh token is revoked
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ userId: seededUserId, refreshToken: existingRefreshToken })
        .expect(401);

      // Reset the user's password back to TEST_PASSWORD for other tests
      const user = await userModel.findById(seededUserId);
      if (user) {
        user.passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
        await user.save();
      }
    });

    it('expired token → 400/401', async () => {
      // Create an already-expired token directly in the DB
      const rawToken = '00000000-0000-0000-0000-000000000001';
      const tokenHash = await bcrypt.hash(rawToken, 10);
      await passwordResetTokenModel.create({
        userId: new Types.ObjectId(seededUserId),
        tokenHash,
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: rawToken, newPassword: 'newpassword456' });

      expect([400, 401]).toContain(res.status);
    });

    it('already-used token → 400/401', async () => {
      // Create a token that has already been used
      const rawToken = '00000000-0000-0000-0000-000000000002';
      const tokenHash = await bcrypt.hash(rawToken, 10);
      await passwordResetTokenModel.create({
        userId: new Types.ObjectId(seededUserId),
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: rawToken, newPassword: 'newpassword456' });

      expect([400, 401]).toContain(res.status);
    });
  });
});

// ─── Rate limiting — isolated app instance ───────────────────────────────────

describe('Auth rate limit (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    // Tight limit of 3 to trigger 429 quickly
    ({ app } = await buildApp(uri, 3));
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('POST /auth/login exceeding rate limit → 429', async () => {
    const results: number[] = [];
    // Send 4 requests — limit is 3 per 60s
    for (let i = 0; i < 4; i++) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'rate@example.com', password: 'x' });
      results.push(res.status);
    }
    expect(results).toContain(429);
  });
});

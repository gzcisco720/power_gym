import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as bcrypt from 'bcryptjs';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  UserProfile,
  UserProfileSchema,
} from '../src/common/models/user-profile.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const TEST_EMAIL = 'users-e2e@example.com';
const TEST_PASSWORD = 'Password1';

async function buildApp(
  uri: string,
  mockEmail?: IEmailService,
): Promise<{ app: INestApplication<App>; module: TestingModule }> {
  const builder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      MongooseModule.forRoot(uri),
      MongooseModule.forFeature([
        { name: User.name, schema: UserSchema },
        { name: UserProfile.name, schema: UserProfileSchema },
      ]),
      ServeStaticModule.forRoot({
        rootPath: join(process.cwd(), 'public'),
        serveRoot: '/',
      }),
      ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
      PassportModule,
      AuthModule,
      EmailModule,
      UsersModule,
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

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let userProfileModel: Model<UserProfileDocument>;
  let accessToken: string;
  let seededUserId: string;

  type UserProfileDocument = InstanceType<typeof UserProfile>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    userProfileModel = module.get<Model<UserProfileDocument>>(
      getModelToken(UserProfile.name),
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

    // Login to get access token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(201);

    accessToken = (loginRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await userProfileModel.deleteMany({});
  });

  // ─── GET /users/me/profile ────────────────────────────────────────────────────

  describe('GET /users/me/profile', () => {
    it('valid member token → 200 and body contains firstName, email, and fitnessGoal keys', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('firstName', 'E2E');
      expect(body).toHaveProperty('email', TEST_EMAIL);
      expect(body).toHaveProperty('fitnessGoal');
    });

    it('no Authorization header → 401', async () => {
      await request(app.getHttpServer()).get('/users/me/profile').expect(401);
    });
  });

  // ─── PATCH /users/me/profile ──────────────────────────────────────────────────

  describe('PATCH /users/me/profile', () => {
    it('{ firstName: "Jane", mobile: "123" } → 200, then GET returns updated values', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Jane', mobile: '123' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/users/me/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('firstName', 'Jane');
      expect(body).toHaveProperty('mobile', '123');

      // Restore original name
      await userModel.findByIdAndUpdate(seededUserId, {
        $set: { firstName: 'E2E' },
      });
    });
  });

  // ─── PATCH /users/me/password ─────────────────────────────────────────────────

  describe('PATCH /users/me/password', () => {
    it('wrong current password → 400', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'WrongPass1', newPassword: 'NewPass2' })
        .expect(400);
    });

    it('newPassword: "short" → 400 (validation)', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: TEST_PASSWORD, newPassword: 'short' })
        .expect(400);
    });
  });

  // ─── POST /users/me/avatar ────────────────────────────────────────────────────

  describe('POST /users/me/avatar', () => {
    it('valid PNG buffer → 200/201 and body avatarUrl matches /^\\/uploads\\///', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const res = await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', pngBuffer, {
          filename: 'avatar.png',
          contentType: 'image/png',
        });

      expect([200, 201]).toContain(res.status);
      const body = res.body as { avatarUrl: string };
      expect(body.avatarUrl).toMatch(/^\/uploads\//);
    });
  });

  // ─── POST /auth/dev/seed-user-role ────────────────────────────────────────────

  describe('POST /auth/dev/seed-user-role', () => {
    it('seeds an owner-role user who can log in', async () => {
      await request(app.getHttpServer())
        .post('/auth/dev/seed-user-role')
        .send({
          email: 'owner@example.com',
          password: 'Password1',
          role: 'owner',
        })
        .expect(200);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'owner@example.com', password: 'Password1' })
        .expect(201);

      const body = loginRes.body as { user: { role: string } };
      expect(body.user.role).toBe('owner');
    });
  });
});

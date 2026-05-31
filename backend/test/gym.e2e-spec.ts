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
import { GymModule } from '../src/modules/gym/gym.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  UserProfile,
  UserProfileSchema,
  UserProfileDocument,
} from '../src/common/models/user-profile.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'gym-e2e-owner@example.com';
const MEMBER_EMAIL = 'gym-e2e-member@example.com';
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
      GymModule,
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

describe('Gym (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let userProfileModel: Model<UserProfileDocument>;
  let ownerToken: string;
  let memberToken: string;
  let ownerUserId: string;

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

    const owner = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Gym',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });
    ownerUserId = owner._id.toString();

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Gym',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: null,
    });

    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: OWNER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    ownerToken = (ownerLogin.body as { accessToken: string }).accessToken;

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: MEMBER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    memberToken = (memberLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await userProfileModel.deleteMany({});
  });

  // ─── GET /gym/branding ────────────────────────────────────────────────────────

  describe('GET /gym/branding', () => {
    it('member token → 200 and body has gymName + logoUrl keys', async () => {
      const res = await request(app.getHttpServer())
        .get('/gym/branding')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('gymName');
      expect(body).toHaveProperty('logoUrl');
    });
  });

  // ─── GET /gym/info ────────────────────────────────────────────────────────────

  describe('GET /gym/info', () => {
    it('member token → 403 (role guard)', async () => {
      await request(app.getHttpServer())
        .get('/gym/info')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── PATCH /gym/info ──────────────────────────────────────────────────────────

  describe('PATCH /gym/info', () => {
    it('owner token { name: "Iron Gym", phone: "555" } → 200, then GET /gym/branding returns gymName: "Iron Gym"', async () => {
      await request(app.getHttpServer())
        .patch('/gym/info')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Iron Gym', phone: '555' })
        .expect(200);

      const brandingRes = await request(app.getHttpServer())
        .get('/gym/branding')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const body = brandingRes.body as Record<string, unknown>;
      expect(body).toHaveProperty('gymName', 'Iron Gym');
    });
  });

  // ─── POST /gym/logo ───────────────────────────────────────────────────────────

  describe('POST /gym/logo', () => {
    it('owner token + PNG buffer + kind=sidebar → 200 and logoUrl matches /^\\/uploads\\///', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      // Seed a profile for owner so gymInfo can be set
      await userProfileModel.create({
        userId: new Types.ObjectId(ownerUserId),
        gymInfo: { name: null, logoUrl: null, loginLogoUrl: null },
      });

      const res = await request(app.getHttpServer())
        .post('/gym/logo')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('kind', 'sidebar')
        .attach('file', pngBuffer, {
          filename: 'logo.png',
          contentType: 'image/png',
        });

      expect([200, 201]).toContain(res.status);
      const body = res.body as { logoUrl: string };
      expect(body.logoUrl).toMatch(/^\/uploads\//);
    });
  });
});

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
import { EquipmentModule } from '../src/modules/equipment/equipment.module';
import { CheckInsModule } from '../src/modules/check-ins/check-ins.module';
import { BodyTestsModule } from '../src/modules/body-tests/body-tests.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'bt-e2e-owner@example.com';
const MEMBER_EMAIL = 'bt-e2e-member@example.com';
const OTHER_OWNER_EMAIL = 'bt-e2e-other-owner@example.com';
const TEST_PASSWORD = 'Password1';

const valid3SiteBody = {
  date: '2026-06-03',
  age: 30,
  sex: 'male',
  weight: 80,
  protocol: '3site',
  chest: 10,
  abdominal: 20,
  thigh: 15,
};

async function buildApp(
  uri: string,
  mockEmail?: IEmailService,
): Promise<{ app: INestApplication<App>; module: TestingModule }> {
  const builder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      MongooseModule.forRoot(uri),
      MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
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
      EquipmentModule,
      CheckInsModule,
      BodyTestsModule,
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

describe('BodyTests (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let ownerToken: string;
  let memberToken: string;
  let otherOwnerToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const ownerObjId = new Types.ObjectId();

    await userModel.create({
      _id: ownerObjId,
      firstName: 'BT',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'BT',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: ownerObjId,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'BT',
      lastName: 'OtherOwner',
      email: OTHER_OWNER_EMAIL,
      passwordHash,
      role: 'owner',
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

    const otherOwnerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: OTHER_OWNER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    otherOwnerToken = (otherOwnerLogin.body as { accessToken: string })
      .accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── GET /body-tests/me ──────────────────────────────────────────────────────

  describe('GET /body-tests/me', () => {
    it('owner token → 200 array', async () => {
      const res = await request(app.getHttpServer())
        .get('/body-tests/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('member token → 200 array', async () => {
      const res = await request(app.getHttpServer())
        .get('/body-tests/me')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/body-tests/me').expect(401);
    });
  });

  // ─── POST /body-tests ────────────────────────────────────────────────────────

  describe('POST /body-tests', () => {
    it('owner token + valid 3site body → 201 with _id, numeric bodyFatPct, fatMassKg, leanMassKg, and trainerId null', async () => {
      const res = await request(app.getHttpServer())
        .post('/body-tests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(valid3SiteBody)
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(typeof body.bodyFatPct).toBe('number');
      expect(typeof body.fatMassKg).toBe('number');
      expect(typeof body.leanMassKg).toBe('number');
      expect(body.trainerId).toBeNull();
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .post('/body-tests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(valid3SiteBody)
        .expect(403);
    });

    it('owner token + age:200 (out of range) → 400', async () => {
      await request(app.getHttpServer())
        .post('/body-tests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...valid3SiteBody, age: 200 })
        .expect(400);
    });
  });

  // ─── POST /body-tests/dev/seed-for-user (dev-only) ──────────────────────────

  describe('POST /body-tests/dev/seed-for-user', () => {
    it('seeds a body test for an existing user and returns { ok: true, seeded: true }', async () => {
      const res = await request(app.getHttpServer())
        .post('/body-tests/dev/seed-for-user')
        .send({ email: MEMBER_EMAIL })
        .expect(200);

      const body = res.body as { ok: boolean; seeded: boolean };
      expect(body.ok).toBe(true);
      expect(body.seeded).toBe(true);
    });

    it('calling again is idempotent and returns { ok: true, seeded: false }', async () => {
      const res = await request(app.getHttpServer())
        .post('/body-tests/dev/seed-for-user')
        .send({ email: MEMBER_EMAIL })
        .expect(200);

      const body = res.body as { ok: boolean; seeded: boolean };
      expect(body.ok).toBe(true);
      expect(body.seeded).toBe(false);
    });

    it('returns 404 when the user does not exist', async () => {
      await request(app.getHttpServer())
        .post('/body-tests/dev/seed-for-user')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);
    });
  });

  // ─── DELETE /body-tests/:id ──────────────────────────────────────────────────

  describe('DELETE /body-tests/:id', () => {
    let createdTestId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/body-tests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(valid3SiteBody)
        .expect(201);
      createdTestId = (res.body as { _id: string })._id;
    });

    it('owner token on own test → 204, and subsequent GET no longer contains it', async () => {
      await request(app.getHttpServer())
        .delete(`/body-tests/${createdTestId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const listRes = await request(app.getHttpServer())
        .get('/body-tests/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const items = listRes.body as Array<{ _id: string }>;
      expect(items.find((item) => item._id === createdTestId)).toBeUndefined();
    });

    it('owner token on a test owned by another user → 404', async () => {
      // Create a test as the first owner
      const createRes = await request(app.getHttpServer())
        .post('/body-tests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(valid3SiteBody)
        .expect(201);
      const ownedTestId = (createRes.body as { _id: string })._id;

      // Try to delete with a different owner's token
      await request(app.getHttpServer())
        .delete(`/body-tests/${ownedTestId}`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .expect(404);
    });
  });
});

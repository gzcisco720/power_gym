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

const OWNER_EMAIL = 'ci-e2e-owner@example.com';
const MEMBER_EMAIL = 'ci-e2e-member@example.com';
const TEST_PASSWORD = 'Password1';

const validBody = {
  sleepQuality: 7,
  stress: 5,
  fatigue: 4,
  hunger: 6,
  recovery: 8,
  energy: 7,
  digestion: 6,
  stuckToDiet: 'yes',
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

describe('CheckIns (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let ownerToken: string;
  let memberToken: string;

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
      firstName: 'CI',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    // Member has a trainerId pointing to the owner
    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'CI',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: ownerObjId,
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

  // ─── POST /check-ins ──────────────────────────────────────────────────────────

  describe('POST /check-ins', () => {
    it('member token + valid body → 201 with _id, memberId, submittedAt', async () => {
      const res = await request(app.getHttpServer())
        .post('/check-ins')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(validBody)
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('submittedAt');
      // memberId is stored as ObjectId, serialized as string
      expect(body).toHaveProperty('memberId');
    });

    it('member token, same week → 409', async () => {
      await request(app.getHttpServer())
        .post('/check-ins')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(validBody)
        .expect(409);
    });

    it('sleepQuality:11 (out of range) + member token → 400', async () => {
      await request(app.getHttpServer())
        .post('/check-ins')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ ...validBody, sleepQuality: 11 })
        .expect(400);
    });
  });

  // ─── GET /check-ins ───────────────────────────────────────────────────────────

  describe('GET /check-ins', () => {
    it('member token → 200 array containing the created check-in', async () => {
      const res = await request(app.getHttpServer())
        .get('/check-ins')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThan(0);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/check-ins').expect(401);
    });

    it('owner token → 403', async () => {
      await request(app.getHttpServer())
        .get('/check-ins')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });
  });

  // ─── POST /check-ins/upload-signature ────────────────────────────────────────

  describe('POST /check-ins/upload-signature', () => {
    it('member token → 200 with provider in ["cloudinary","local"] and folder:"check-ins"', async () => {
      const res = await request(app.getHttpServer())
        .post('/check-ins/upload-signature')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(['cloudinary', 'local']).toContain(body.provider);
      expect(body.folder).toBe('check-ins');
    });
  });
});

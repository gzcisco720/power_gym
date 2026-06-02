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
import { ServiceTypesModule } from '../src/modules/service-types/service-types.module';
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

const OWNER_EMAIL = 'st-e2e-owner@example.com';
const MEMBER_EMAIL = 'st-e2e-member@example.com';
const TEST_PASSWORD = 'Password1';

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
      ServiceTypesModule,
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

describe('ServiceTypes (e2e)', () => {
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

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'St',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'St',
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

  // ─── POST /service-types ──────────────────────────────────────────────────────

  describe('POST /service-types', () => {
    it('owner with {name:"PT Session", durationMin:60, pricePerSession:80} → 201 with _id, currency:"AUD", isActive:true, createdBy present', async () => {
      const res = await request(app.getHttpServer())
        .post('/service-types')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'PT Session', durationMin: 60, pricePerSession: 80 })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('currency', 'AUD');
      expect(body).toHaveProperty('isActive', true);
      expect(body).toHaveProperty('createdBy');
    });

    it('owner with {name:"", durationMin:60, pricePerSession:80} → 400', async () => {
      await request(app.getHttpServer())
        .post('/service-types')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: '', durationMin: 60, pricePerSession: 80 })
        .expect(400);
    });

    it('owner with {name:"X", durationMin:0, pricePerSession:80} → 400 (durationMin below min)', async () => {
      await request(app.getHttpServer())
        .post('/service-types')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'X', durationMin: 0, pricePerSession: 80 })
        .expect(400);
    });
  });

  // ─── GET /service-types ───────────────────────────────────────────────────────

  describe('GET /service-types', () => {
    it('owner → 200 array sorted by name ascending and including a previously created item', async () => {
      await request(app.getHttpServer())
        .post('/service-types')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Yoga', durationMin: 45, pricePerSession: 50 });

      await request(app.getHttpServer())
        .post('/service-types')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Boxing', durationMin: 30, pricePerSession: 60 });

      const res = await request(app.getHttpServer())
        .get('/service-types')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const items = res.body as Array<Record<string, unknown>>;
      expect(items.some((item) => item.name === 'Yoga')).toBe(true);

      // Verify sorted by name ascending
      const names = items.map((item) => item.name as string);
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/service-types').expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get('/service-types')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── PATCH /service-types/:id ─────────────────────────────────────────────────

  describe('PATCH /service-types/:id', () => {
    it('owner with {isActive:false} → 200 with isActive:false', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-types')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Pilates', durationMin: 60, pricePerSession: 70 })
        .expect(201);

      const id = (created.body as Record<string, unknown>)._id as string;

      const res = await request(app.getHttpServer())
        .patch(`/service-types/${id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isActive: false })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('isActive', false);
    });

    it('owner with unknown id → 404', async () => {
      const unknownId = new Types.ObjectId().toString();
      await request(app.getHttpServer())
        .patch(`/service-types/${unknownId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isActive: false })
        .expect(404);
    });
  });
});

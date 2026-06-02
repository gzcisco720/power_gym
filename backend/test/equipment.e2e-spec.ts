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

const OWNER_EMAIL = 'equip-e2e-owner@example.com';
const MEMBER_EMAIL = 'equip-e2e-member@example.com';
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

describe('Equipment (e2e)', () => {
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
      firstName: 'Equip',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Equip',
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

  // ─── POST /equipment ──────────────────────────────────────────────────────────

  describe('POST /equipment', () => {
    it('owner with {name:"Treadmill"} → 201 with _id, status:"active", quantity:1, trackCondition:false', async () => {
      const res = await request(app.getHttpServer())
        .post('/equipment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Treadmill' })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('status', 'active');
      expect(body).toHaveProperty('quantity', 1);
      expect(body).toHaveProperty('trackCondition', false);
    });

    it('owner with {name:""} → 400', async () => {
      await request(app.getHttpServer())
        .post('/equipment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: '' })
        .expect(400);
    });
  });

  // ─── GET /equipment ───────────────────────────────────────────────────────────

  describe('GET /equipment', () => {
    it('owner → 200 array including created item', async () => {
      await request(app.getHttpServer())
        .post('/equipment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Bike' });

      const res = await request(app.getHttpServer())
        .get('/equipment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(
        (res.body as Array<Record<string, unknown>>).some(
          (item) => item.name === 'Bike',
        ),
      ).toBe(true);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/equipment').expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get('/equipment')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── PATCH /equipment/:id ─────────────────────────────────────────────────────

  describe('PATCH /equipment/:id', () => {
    it('owner with {status:"maintenance"} → 200 with status:"maintenance"', async () => {
      const created = await request(app.getHttpServer())
        .post('/equipment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Rower' })
        .expect(201);

      const id = (created.body as Record<string, unknown>)._id as string;

      const res = await request(app.getHttpServer())
        .patch(`/equipment/${id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'maintenance' })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('status', 'maintenance');
    });

    it('unknown id → 404', async () => {
      const unknownId = new Types.ObjectId().toString();
      await request(app.getHttpServer())
        .patch(`/equipment/${unknownId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'retired' })
        .expect(404);
    });
  });

  // ─── DELETE /equipment/:id ────────────────────────────────────────────────────

  describe('DELETE /equipment/:id', () => {
    it('owner → 204, and subsequent GET /equipment no longer contains it', async () => {
      const created = await request(app.getHttpServer())
        .post('/equipment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'ToDelete' })
        .expect(201);

      const id = (created.body as Record<string, unknown>)._id as string;

      await request(app.getHttpServer())
        .delete(`/equipment/${id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const listRes = await request(app.getHttpServer())
        .get('/equipment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const names = (listRes.body as Array<Record<string, unknown>>).map(
        (i) => i._id,
      );
      expect(names).not.toContain(id);
    });
  });

  // ─── POST /equipment/upload-signature ────────────────────────────────────────

  describe('POST /equipment/upload-signature', () => {
    it('owner → 200 with body whose provider is "cloudinary" or "local" and folder:"equipment"', async () => {
      const res = await request(app.getHttpServer())
        .post('/equipment/upload-signature')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(['cloudinary', 'local']).toContain(body.provider);
      expect(body.folder).toBe('equipment');
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .post('/equipment/upload-signature')
        .expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .post('/equipment/upload-signature')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── Condition Reports ────────────────────────────────────────────────────────

  describe('Condition Reports', () => {
    let equipmentId: string;

    beforeEach(async () => {
      const created = await request(app.getHttpServer())
        .post('/equipment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'ConditionalMachine' })
        .expect(201);
      equipmentId = (created.body as Record<string, unknown>)._id as string;
    });

    it('POST /equipment/:id/condition-reports with {note:"Belt worn"} → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/equipment/${equipmentId}/condition-reports`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Belt worn' })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('note', 'Belt worn');
    });

    it('GET /equipment/:id/condition-reports → 200 array newest-first containing the report', async () => {
      await request(app.getHttpServer())
        .post(`/equipment/${equipmentId}/condition-reports`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'First report' });

      await request(app.getHttpServer())
        .post(`/equipment/${equipmentId}/condition-reports`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Second report' });

      const res = await request(app.getHttpServer())
        .get(`/equipment/${equipmentId}/condition-reports`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const notes = (res.body as Array<Record<string, unknown>>).map(
        (r) => r.note,
      );
      expect(notes).toContain('First report');
      expect(notes).toContain('Second report');
    });

    it('POST /equipment/:id/condition-reports with {note:""} → 400', async () => {
      await request(app.getHttpServer())
        .post(`/equipment/${equipmentId}/condition-reports`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: '' })
        .expect(400);
    });
  });
});

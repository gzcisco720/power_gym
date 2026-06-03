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
import { ScheduledSessionsModule } from '../src/modules/scheduled-sessions/scheduled-sessions.module';
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

const OWNER_EMAIL = 'ss-e2e-owner@example.com';
const MEMBER_EMAIL = 'ss-e2e-member@example.com';
const MEMBER2_EMAIL = 'ss-e2e-member2@example.com';
const TRAINER_EMAIL = 'ss-e2e-trainer@example.com';
const TRAINER2_EMAIL = 'ss-e2e-trainer2@example.com';
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
      CheckInsModule,
      ScheduledSessionsModule,
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

describe('ScheduledSessions (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let ownerToken: string;
  let memberToken: string;
  let member2Token: string;
  let trainerToken: string;
  let trainer2Token: string;
  let memberId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const ownerObjId = new Types.ObjectId();
    const trainerObjId = new Types.ObjectId();
    const trainer2ObjId = new Types.ObjectId();
    const memberObjId = new Types.ObjectId();

    await userModel.create({
      _id: ownerObjId,
      firstName: 'SS',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: trainerObjId,
      firstName: 'SS',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: trainer2ObjId,
      firstName: 'SS',
      lastName: 'Trainer2',
      email: TRAINER2_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    const memberDoc = await userModel.create({
      _id: memberObjId,
      firstName: 'SS',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: ownerObjId,
    });
    memberId = memberDoc._id.toString();

    await userModel.create({
      firstName: 'SS',
      lastName: 'Member2',
      email: MEMBER2_EMAIL,
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

    const member2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: MEMBER2_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    member2Token = (member2Login.body as { accessToken: string }).accessToken;

    const trainerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TRAINER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    trainerToken = (trainerLogin.body as { accessToken: string }).accessToken;

    const trainer2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TRAINER2_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    trainer2Token = (trainer2Login.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── GET /scheduled-sessions/my ──────────────────────────────────────────────

  describe('GET /scheduled-sessions/my', () => {
    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .get('/scheduled-sessions/my')
        .expect(401);
    });

    it('owner token → 403', async () => {
      await request(app.getHttpServer())
        .get('/scheduled-sessions/my')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('member token → 200 with empty array (no sessions yet)', async () => {
      const res = await request(app.getHttpServer())
        .get('/scheduled-sessions/my')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('after seeding two sessions the array has >= 2 items, sorted date asc, with required keys', async () => {
      // Seed sessions for the member via the dev endpoint
      await request(app.getHttpServer())
        .post('/scheduled-sessions/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          sessions: [
            {
              date: '2026-09-01T09:00:00.000Z',
              startTime: '09:00',
              endTime: '10:00',
              serviceTypeName: 'Strength Training',
            },
            {
              date: '2026-08-01T09:00:00.000Z',
              startTime: '08:00',
              endTime: '09:00',
            },
          ],
        })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/scheduled-sessions/my')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const items = res.body as Array<Record<string, unknown>>;
      expect(items.length).toBeGreaterThanOrEqual(2);

      // Sorted ascending by date
      for (let i = 1; i < items.length; i++) {
        const prev = new Date(items[i - 1].date as string).getTime();
        const curr = new Date(items[i].date as string).getTime();
        expect(prev).toBeLessThanOrEqual(curr);
      }

      // Each item has required keys
      for (const item of items) {
        expect(item).toHaveProperty('_id');
        expect(item).toHaveProperty('trainerName');
        expect(item).toHaveProperty('isRecurring');
        expect(
          Object.prototype.hasOwnProperty.call(item, 'serviceTypeName'),
        ).toBe(true);
      }
    });

    it('member2 does NOT receive member1 sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/scheduled-sessions/my')
        .set('Authorization', `Bearer ${member2Token}`)
        .expect(200);

      const items = res.body as Array<Record<string, unknown>>;
      // Member2 has no seeded sessions
      expect(items.length).toBe(0);
    });
  });

  // ─── POST /scheduled-sessions ─────────────────────────────────────────────

  describe('POST /scheduled-sessions', () => {
    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .post('/scheduled-sessions')
        .send({
          date: '2027-01-10T09:00:00.000Z',
          startTime: '09:00',
          endTime: '10:00',
          memberIds: [memberId],
        })
        .expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .post('/scheduled-sessions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          date: '2027-01-10T09:00:00.000Z',
          startTime: '09:00',
          endTime: '10:00',
          memberIds: [memberId],
        })
        .expect(403);
    });

    it('owner token + valid body → 201 returns array with SessionDto including _id, seriesId, memberNames', async () => {
      const res = await request(app.getHttpServer())
        .post('/scheduled-sessions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          date: '2027-01-10T09:00:00.000Z',
          startTime: '09:00',
          endTime: '10:00',
          memberIds: [memberId],
        })
        .expect(201);

      const items = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(1);
      expect(items[0]).toHaveProperty('_id');
      expect(Object.prototype.hasOwnProperty.call(items[0], 'seriesId')).toBe(
        true,
      );
      expect(items[0]).toHaveProperty('memberNames');
    });

    it('malformed body (missing memberIds) → 400', async () => {
      await request(app.getHttpServer())
        .post('/scheduled-sessions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          date: '2027-01-10T09:00:00.000Z',
          startTime: '09:00',
          endTime: '10:00',
          // memberIds missing
        })
        .expect(400);
    });

    it('recurrence.weeks=3 → 3 docs sharing one seriesId appear in GET /scheduled-sessions', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/scheduled-sessions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          date: '2027-02-01T09:00:00.000Z',
          startTime: '10:00',
          endTime: '11:00',
          memberIds: [memberId],
          recurrence: { weeks: 3 },
        })
        .expect(201);

      const createdItems = createRes.body as Array<Record<string, unknown>>;
      expect(createdItems.length).toBe(3);

      const seriesIds = createdItems.map((i) => i['seriesId']);
      expect(new Set(seriesIds).size).toBe(1);
      expect(seriesIds[0]).not.toBeNull();

      // Verify via GET
      const getRes = await request(app.getHttpServer())
        .get('/scheduled-sessions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ range: 'upcoming' })
        .expect(200);

      const allItems = getRes.body as Array<Record<string, unknown>>;
      const seriesItems = allItems.filter(
        (i) => i['seriesId'] === seriesIds[0],
      );
      expect(seriesItems.length).toBe(3);
    });
  });

  // ─── GET /scheduled-sessions ─────────────────────────────────────────────

  describe('GET /scheduled-sessions', () => {
    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/scheduled-sessions').expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get('/scheduled-sessions')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('trainer token returns only sessions where trainerId is that trainer', async () => {
      // Create session for trainer1
      await request(app.getHttpServer())
        .post('/scheduled-sessions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          date: '2027-03-01T09:00:00.000Z',
          startTime: '08:00',
          endTime: '09:00',
          memberIds: [memberId],
          trainerId: (
            await userModel.findOne({ email: TRAINER_EMAIL })
          )?._id.toString(),
        })
        .expect(201);

      // Create session for trainer2
      await request(app.getHttpServer())
        .post('/scheduled-sessions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          date: '2027-03-01T10:00:00.000Z',
          startTime: '10:00',
          endTime: '11:00',
          memberIds: [memberId],
          trainerId: (
            await userModel.findOne({ email: TRAINER2_EMAIL })
          )?._id.toString(),
        })
        .expect(201);

      // trainer1 should only see their own sessions
      const trainerRes = await request(app.getHttpServer())
        .get('/scheduled-sessions')
        .set('Authorization', `Bearer ${trainerToken}`)
        .query({ range: 'upcoming' })
        .expect(200);

      const trainerItems = trainerRes.body as Array<Record<string, unknown>>;
      const trainer1Doc = await userModel.findOne({ email: TRAINER_EMAIL });
      const trainer1Id = trainer1Doc?._id.toString();

      for (const item of trainerItems) {
        expect(item['trainerId']).toBe(trainer1Id);
      }

      // trainer2 should only see their own sessions
      const trainer2Res = await request(app.getHttpServer())
        .get('/scheduled-sessions')
        .set('Authorization', `Bearer ${trainer2Token}`)
        .query({ range: 'upcoming' })
        .expect(200);

      const trainer2Items = trainer2Res.body as Array<Record<string, unknown>>;
      const trainer2Doc = await userModel.findOne({ email: TRAINER2_EMAIL });
      const trainer2Id = trainer2Doc?._id.toString();

      for (const item of trainer2Items) {
        expect(item['trainerId']).toBe(trainer2Id);
      }
    });
  });

  // ─── PATCH /scheduled-sessions/:id ───────────────────────────────────────

  describe('PATCH /scheduled-sessions/:id', () => {
    it('scope=series updates startTime on all series docs', async () => {
      // Create a series of 2
      const createRes = await request(app.getHttpServer())
        .post('/scheduled-sessions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          date: '2027-04-01T09:00:00.000Z',
          startTime: '07:00',
          endTime: '08:00',
          memberIds: [memberId],
          recurrence: { weeks: 2 },
        })
        .expect(201);

      const createdItems = createRes.body as Array<Record<string, unknown>>;
      const firstId = createdItems[0]['_id'] as string;

      await request(app.getHttpServer())
        .patch(`/scheduled-sessions/${firstId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ startTime: '08:00', scope: 'series' })
        .expect(200);

      // Verify via GET — both series docs should have startTime 08:00
      const getRes = await request(app.getHttpServer())
        .get('/scheduled-sessions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ range: 'upcoming' })
        .expect(200);

      const allItems = getRes.body as Array<Record<string, unknown>>;
      const seriesItems = allItems.filter(
        (i) => i['seriesId'] === createdItems[0]['seriesId'],
      );
      expect(seriesItems.length).toBe(2);
      for (const item of seriesItems) {
        expect(item['startTime']).toBe('08:00');
      }
    });
  });

  // ─── DELETE /scheduled-sessions/:id ──────────────────────────────────────

  describe('DELETE /scheduled-sessions/:id', () => {
    it('scope=single removes that doc; sibling series docs remain', async () => {
      // Create a series of 2
      const createRes = await request(app.getHttpServer())
        .post('/scheduled-sessions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          date: '2027-05-01T09:00:00.000Z',
          startTime: '06:00',
          endTime: '07:00',
          memberIds: [memberId],
          recurrence: { weeks: 2 },
        })
        .expect(201);

      const createdItems = createRes.body as Array<Record<string, unknown>>;
      const firstId = createdItems[0]['_id'] as string;
      const seriesId = createdItems[0]['seriesId'] as string;

      await request(app.getHttpServer())
        .delete(`/scheduled-sessions/${firstId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ scope: 'single' })
        .expect(200);

      // Verify via GET
      const getRes = await request(app.getHttpServer())
        .get('/scheduled-sessions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ range: 'upcoming' })
        .expect(200);

      const allItems = getRes.body as Array<Record<string, unknown>>;
      const remainingSeriesItems = allItems.filter(
        (i) => i['seriesId'] === seriesId,
      );
      // Second doc of the series should remain
      expect(remainingSeriesItems.length).toBe(1);
      // First doc should be gone
      const deletedStillExists = allItems.some((i) => i['_id'] === firstId);
      expect(deletedStillExists).toBe(false);
    });
  });
});

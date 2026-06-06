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
import { BillingModule } from '../src/modules/billing/billing.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  ServiceType,
  ServiceTypeSchema,
  ServiceTypeDocument,
} from '../src/common/models/service-type.model';
import {
  ScheduledSession,
  ScheduledSessionSchema,
  ScheduledSessionDocument,
} from '../src/common/models/scheduled-session.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'bill-e2e-owner@example.com';
const TRAINER_EMAIL = 'bill-e2e-trainer@example.com';
const MEMBER_EMAIL = 'bill-e2e-member@example.com';
const TEST_PASSWORD = 'Password1';

// Dates: all in the past to be billable
const PAST_DATE = new Date(Date.now() - 7 * 86400000);
const FROM = new Date(Date.now() - 30 * 86400000).toISOString();
const TO = new Date(Date.now() + 86400000).toISOString();

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
        { name: ServiceType.name, schema: ServiceTypeSchema },
        { name: ScheduledSession.name, schema: ScheduledSessionSchema },
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
      BillingModule,
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

describe('Billing (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let serviceTypeModel: Model<ServiceTypeDocument>;
  let sessionModel: Model<ScheduledSessionDocument>;

  let ownerToken: string;
  let trainerToken: string;
  let memberToken: string;

  let ownerId: Types.ObjectId;
  let trainerId: Types.ObjectId;
  let memberId: Types.ObjectId;
  let serviceTypeId: Types.ObjectId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    serviceTypeModel = module.get<Model<ServiceTypeDocument>>(
      getModelToken(ServiceType.name),
    );
    sessionModel = module.get<Model<ScheduledSessionDocument>>(
      getModelToken(ScheduledSession.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    ownerId = new Types.ObjectId();
    trainerId = new Types.ObjectId();
    memberId = new Types.ObjectId();

    await userModel.create({
      _id: ownerId,
      firstName: 'Bill',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: trainerId,
      firstName: 'Bill',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: memberId,
      firstName: 'Bill',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: trainerId,
    });

    // Seed a service type
    const st = await serviceTypeModel.create({
      _id: new Types.ObjectId(),
      name: 'PT Session',
      durationMin: 60,
      pricePerSession: 100,
      currency: 'AUD',
      isActive: true,
      createdBy: ownerId,
    });
    serviceTypeId = st._id;

    // Seed 2 billable sessions for the member
    await sessionModel.create({
      _id: new Types.ObjectId(),
      trainerId,
      memberIds: [memberId],
      date: PAST_DATE,
      startTime: '09:00',
      endTime: '10:00',
      status: 'scheduled',
      serviceTypeId,
    });

    await sessionModel.create({
      _id: new Types.ObjectId(),
      trainerId,
      memberIds: [memberId],
      date: new Date(Date.now() - 14 * 86400000),
      startTime: '10:00',
      endTime: '11:00',
      status: 'scheduled',
      serviceTypeId,
    });

    // Seed a cancelled session (should NOT count)
    await sessionModel.create({
      _id: new Types.ObjectId(),
      trainerId,
      memberIds: [memberId],
      date: PAST_DATE,
      startTime: '11:00',
      endTime: '12:00',
      status: 'cancelled',
      serviceTypeId,
    });

    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: OWNER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    ownerToken = (ownerLogin.body as { accessToken: string }).accessToken;

    const trainerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TRAINER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    trainerToken = (trainerLogin.body as { accessToken: string }).accessToken;

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

  // ─── GET /billing/summary ─────────────────────────────────────────────────────

  describe('GET /billing/summary', () => {
    it('owner with billable sessions → 200, body has members, grandTotal, currency; member appears with correct sessionsCount and totalAmount', async () => {
      const res = await request(app.getHttpServer())
        .get('/billing/summary')
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as {
        members: Array<{
          memberId: string;
          name: string;
          sessionsCount: number;
          totalAmount: number;
          currency: string;
        }>;
        grandTotal: number;
        currency: string;
      };

      expect(Array.isArray(body.members)).toBe(true);
      expect(typeof body.grandTotal).toBe('number');
      expect(typeof body.currency).toBe('string');

      const member = body.members.find(
        (m) => m.memberId === memberId.toString(),
      );
      expect(member).toBeDefined();
      expect(member?.sessionsCount).toBe(2);
      expect(member?.totalAmount).toBe(200);
    });

    it('trainer token → 200 (trainer scoped to their own sessions)', async () => {
      const res = await request(app.getHttpServer())
        .get('/billing/summary')
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const body = res.body as {
        members: unknown[];
        grandTotal: number;
        currency: string;
      };
      expect(Array.isArray(body.members)).toBe(true);
      expect(typeof body.grandTotal).toBe('number');
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get('/billing/summary')
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .get('/billing/summary')
        .query({ from: FROM, to: TO })
        .expect(401);
    });

    it('invalid JWT → 401', async () => {
      await request(app.getHttpServer())
        .get('/billing/summary')
        .query({ from: FROM, to: TO })
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  // ─── GET /billing/members/:memberId ──────────────────────────────────────────

  describe('GET /billing/members/:memberId', () => {
    it("trainer for the member → 200 with per-member billing shape", async () => {
      const res = await request(app.getHttpServer())
        .get(`/billing/members/${memberId.toString()}`)
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const body = res.body as {
        memberId: string;
        lines: Array<{ serviceTypeName: string; price: number }>;
        total: number;
        count: number;
        currency: string;
      };

      expect(body.memberId).toBe(memberId.toString());
      expect(typeof body.total).toBe('number');
      expect(typeof body.count).toBe('number');
      expect(Array.isArray(body.lines)).toBe(true);
    });

    it('trainer for an unassigned member → 404', async () => {
      // Create another member not assigned to the trainer
      const otherMemberId = new Types.ObjectId();
      const otherHash = await bcrypt.hash(TEST_PASSWORD, 10);
      await userModel.create({
        _id: otherMemberId,
        firstName: 'Other',
        lastName: 'Member',
        email: 'bill-e2e-other-member@example.com',
        passwordHash: otherHash,
        role: 'member',
        trainerId: null,
      });

      await request(app.getHttpServer())
        .get(`/billing/members/${otherMemberId.toString()}`)
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(404);
    });

    it('member role → 403', async () => {
      await request(app.getHttpServer())
        .get(`/billing/members/${memberId.toString()}`)
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('no JWT → 401', async () => {
      await request(app.getHttpServer())
        .get(`/billing/members/${memberId.toString()}`)
        .query({ from: FROM, to: TO })
        .expect(401);
    });
  });

  // ─── GET /billing/my ──────────────────────────────────────────────────────────

  describe('GET /billing/my', () => {
    it('member with billable sessions → 200, body has lines (each with serviceTypeName and price), total, count, currency', async () => {
      const res = await request(app.getHttpServer())
        .get('/billing/my')
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const body = res.body as {
        memberId: string;
        lines: Array<{
          serviceTypeName: string;
          price: number;
          currency: string;
        }>;
        total: number;
        count: number;
        currency: string;
      };

      expect(Array.isArray(body.lines)).toBe(true);
      expect(body.count).toBe(2);
      expect(body.total).toBe(200);
      expect(body.currency).toBe('AUD');

      const line = body.lines[0];
      expect(typeof line.serviceTypeName).toBe('string');
      expect(typeof line.price).toBe('number');
    });

    it('owner token → 403', async () => {
      await request(app.getHttpServer())
        .get('/billing/my')
        .query({ from: FROM, to: TO })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('invalid from (non-ISO) → 400', async () => {
      await request(app.getHttpServer())
        .get('/billing/my')
        .query({ from: 'not-a-date', to: TO })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);
    });

    it('invalid to (non-ISO) → 400', async () => {
      await request(app.getHttpServer())
        .get('/billing/my')
        .query({ from: FROM, to: 'also-not-a-date' })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .get('/billing/my')
        .query({ from: FROM, to: TO })
        .expect(401);
    });
  });
});

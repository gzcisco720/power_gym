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
import { DashboardModule } from '../src/modules/dashboard/dashboard.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  WorkoutSession,
  WorkoutSessionSchema,
  WorkoutSessionDocument,
} from '../src/common/models/workout-session.model';
import {
  Equipment,
  EquipmentSchema,
  EquipmentDocument,
} from '../src/common/models/equipment.model';
import {
  InviteToken,
  InviteTokenSchema,
  InviteTokenDocument,
} from '../src/common/models/invite-token.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'dash-e2e-owner@example.com';
const TRAINER_EMAIL = 'dash-e2e-trainer@example.com';
const MEMBER_EMAIL = 'dash-e2e-member@example.com';
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
        { name: WorkoutSession.name, schema: WorkoutSessionSchema },
        { name: Equipment.name, schema: EquipmentSchema },
        { name: InviteToken.name, schema: InviteTokenSchema },
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
      DashboardModule,
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

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let sessionModel: Model<WorkoutSessionDocument>;
  let equipmentModel: Model<EquipmentDocument>;
  let inviteModel: Model<InviteTokenDocument>;
  let ownerToken: string;
  let trainerToken: string;
  let memberToken: string;
  let trainerId: Types.ObjectId;
  let memberId: Types.ObjectId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    sessionModel = module.get<Model<WorkoutSessionDocument>>(
      getModelToken(WorkoutSession.name),
    );
    equipmentModel = module.get<Model<EquipmentDocument>>(
      getModelToken(Equipment.name),
    );
    inviteModel = module.get<Model<InviteTokenDocument>>(
      getModelToken(InviteToken.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Dashboard',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    trainerId = new Types.ObjectId();
    await userModel.create({
      _id: trainerId,
      firstName: 'Dashboard',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    memberId = new Types.ObjectId();
    await userModel.create({
      _id: memberId,
      firstName: 'Dashboard',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId,
    });

    // Seed a completed workout session for the member
    const memberPlanId = new Types.ObjectId();
    await sessionModel.create({
      _id: new Types.ObjectId(),
      memberId,
      memberPlanId,
      dayNumber: 1,
      dayName: 'Day 1',
      startedAt: new Date(),
      completedAt: new Date(),
      lastActivityAt: new Date(),
      autoSealed: false,
      sets: [],
    });

    // Seed equipment
    await equipmentModel.create({
      _id: new Types.ObjectId(),
      name: 'Barbell',
      status: 'active',
      quantity: 5,
    });
    await equipmentModel.create({
      _id: new Types.ObjectId(),
      name: 'Treadmill',
      status: 'maintenance',
      quantity: 2,
      note: 'Belt worn',
    });

    // Seed an expiring invite
    await inviteModel.create({
      _id: new Types.ObjectId(),
      token: 'test-token-123',
      role: 'member',
      invitedBy: new Types.ObjectId(),
      recipientEmail: 'newmember@test.com',
      expiresAt: new Date(Date.now() + 1 * 86400000), // 1 day from now
      usedAt: null,
      trainerId: null,
    });

    // Login to get tokens
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

  // ─── GET /dashboard/owner ─────────────────────────────────────────────────

  describe('GET /dashboard/owner', () => {
    it('owner token → 200, body contains required keys with all ten stats fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/owner')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('stats');
      expect(body).toHaveProperty('memberGrowth');
      expect(body).toHaveProperty('trainerPerformance');
      expect(body).toHaveProperty('equipment');

      const stats = body.stats as Record<string, unknown>;
      expect(stats).toHaveProperty('trainerCount');
      expect(stats).toHaveProperty('memberCount');
      expect(stats).toHaveProperty('membersJoinedThisMonth');
      expect(stats).toHaveProperty('sessionsThisMonth');
      expect(stats).toHaveProperty('sessionsLastMonth');
      expect(stats).toHaveProperty('activeToday');
      expect(stats).toHaveProperty('checkinRateThisWeek');
      expect(stats).toHaveProperty('checkinRateLastWeek');
      expect(stats).toHaveProperty('pendingInviteCount');
      expect(stats).toHaveProperty('expiringInviteCount');

      // Verify values from seeded data
      expect(stats.trainerCount).toBe(1);
      expect(stats.memberCount).toBe(1);
    });

    it('trainer token → 403', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/owner')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(403);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/owner')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/dashboard/owner').expect(401);
    });
  });
});

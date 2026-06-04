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
import { JourneyModule } from '../src/modules/journey/journey.module';
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

interface JourneySessionSummary {
  _id: string;
  date: string;
  dayName: string;
  completedSetCount: number;
}

interface JourneyNutritionDay {
  date: string;
  logged: boolean;
  loggedKcal: number;
  targetKcal: number;
  targetMet: boolean;
}

interface JourneyBodyTestPoint {
  _id: string;
  date: string;
  weight: number;
  bodyFatPct: number;
}

interface JourneySummaryBody {
  workoutStreak: number;
  recentSessions: JourneySessionSummary[];
  nutritionDays: JourneyNutritionDay[];
  bodyTests: JourneyBodyTestPoint[];
}

const OWNER_EMAIL = 'jrn-e2e-owner@example.com';
const MEMBER_EMAIL = 'jrn-e2e-member@example.com';
const EMPTY_MEMBER_EMAIL = 'jrn-e2e-empty-member@example.com';
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
      JourneyModule,
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

describe('Journey (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let ownerToken: string;
  let memberToken: string;
  let emptyMemberToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'JRN',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'JRN',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'JRN',
      lastName: 'EmptyMember',
      email: EMPTY_MEMBER_EMAIL,
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

    const emptyMemberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: EMPTY_MEMBER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    emptyMemberToken = (emptyMemberLogin.body as { accessToken: string })
      .accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── GET /journey (auth + role guards) ───────────────────────────────────────

  describe('GET /journey', () => {
    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/journey').expect(401);
    });

    it('owner token (wrong role) → 403', async () => {
      await request(app.getHttpServer())
        .get('/journey')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('empty member (no data) → 200 with workoutStreak=0, recentSessions=[], nutritionDays.length=7, bodyTests=[]', async () => {
      const res = await request(app.getHttpServer())
        .get('/journey')
        .set('Authorization', `Bearer ${emptyMemberToken}`)
        .expect(200);

      const body = res.body as JourneySummaryBody;
      expect(body.workoutStreak).toBe(0);
      expect(body.recentSessions).toEqual([]);
      expect(body.nutritionDays).toHaveLength(7);
      expect(body.nutritionDays.every((d) => d.logged === false)).toBe(true);
      expect(body.bodyTests).toEqual([]);
    });

    it('member seeded with session + nutrition log + body test → 200 with workoutStreak>=1, recentSessions.length=1, nutritionDays.length=7, bodyTests.length=1, and today nutritionDay has targetKcal>0', async () => {
      // Seed via dev endpoint
      await request(app.getHttpServer())
        .post('/journey/dev/seed')
        .send({ memberEmail: MEMBER_EMAIL })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/journey')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const body = res.body as JourneySummaryBody;
      expect(body.workoutStreak).toBeGreaterThanOrEqual(1);
      expect(body.recentSessions).toHaveLength(1);
      expect(body.nutritionDays).toHaveLength(7);
      expect(body.bodyTests).toHaveLength(1);

      // The seeded nutrition plan day-type has 1800 kcal target
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayDay = body.nutritionDays.find((d) => d.date === todayStr);
      expect(todayDay).toBeDefined();
      expect(todayDay!.targetKcal).toBeGreaterThan(0);
    });
  });
});

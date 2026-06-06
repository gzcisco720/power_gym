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
import {
  WorkoutSession,
  WorkoutSessionSchema,
  WorkoutSessionDocument,
} from '../src/common/models/workout-session.model';
import {
  JourneyTimelineItem,
} from '../src/modules/journey/journey.service';

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

const TRAINER_EMAIL = 'jrn-e2e-trainer@example.com';
const TIMELINE_MEMBER_EMAIL = 'jrn-e2e-timeline-member@example.com';

describe('Journey (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let workoutSessionModel: Model<WorkoutSessionDocument>;
  let ownerToken: string;
  let memberToken: string;
  let emptyMemberToken: string;
  let trainerToken: string;
  let timelineMemberToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    workoutSessionModel = module.get<Model<WorkoutSessionDocument>>(
      getModelToken(WorkoutSession.name),
    );

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

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'JRN',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'JRN',
      lastName: 'TimelineMember',
      email: TIMELINE_MEMBER_EMAIL,
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

    const trainerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TRAINER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    trainerToken = (trainerLogin.body as { accessToken: string }).accessToken;

    const timelineMemberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TIMELINE_MEMBER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    timelineMemberToken = (
      timelineMemberLogin.body as { accessToken: string }
    ).accessToken;
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

  // ─── GET /journey/timeline ────────────────────────────────────────────────────

  describe('GET /journey/timeline', () => {
    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .get('/journey/timeline')
        .expect(401);
    });

    it('trainer token (forbidden role) → 403', async () => {
      await request(app.getHttpServer())
        .get('/journey/timeline')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(403);
    });

    it('member with no data → 200 with items (only joined) and nextCursor null', async () => {
      const res = await request(app.getHttpServer())
        .get('/journey/timeline')
        .set('Authorization', `Bearer ${emptyMemberToken}`)
        .expect(200);

      const body = res.body as { items: JourneyTimelineItem[]; nextCursor: string | null };
      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('nextCursor');
      expect(Array.isArray(body.items)).toBe(true);
      // Only the joined event
      expect(body.items).toHaveLength(1);
      expect(body.items[0].type).toBe('joined');
      expect(body.nextCursor).toBeNull();
    });

    it('member as timeline member → 200 with items in descending date order', async () => {
      // Seed 3 sessions for the timeline member
      const timelineMember = await userModel
        .findOne({ email: TIMELINE_MEMBER_EMAIL })
        .lean();
      const memberId = timelineMember!._id;
      const fakeplanId = new Types.ObjectId();
      const fakeExerciseId = new Types.ObjectId();

      for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (i + 1));
        await workoutSessionModel.create({
          memberId,
          memberPlanId: fakeplanId,
          dayNumber: i + 1,
          dayName: `Day ${i + 1}`,
          startedAt: d,
          completedAt: d,
          lastActivityAt: d,
          autoSealed: false,
          sets: [
            {
              exerciseId: fakeExerciseId,
              exerciseName: 'Squat',
              groupId: 'g1',
              isSuperset: false,
              isBodyweight: false,
              setNumber: 1,
              prescribedRepsMin: 5,
              prescribedRepsMax: 8,
              isExtraSet: false,
              actualReps: 6,
              actualWeight: 100,
              completedAt: d,
            },
          ],
          loggedBy: null,
          rpe: null,
          memberNote: null,
        });
      }

      const res = await request(app.getHttpServer())
        .get('/journey/timeline')
        .set('Authorization', `Bearer ${timelineMemberToken}`)
        .expect(200);

      const body = res.body as { items: JourneyTimelineItem[]; nextCursor: string | null };
      expect(body.items.length).toBeGreaterThan(0);

      // Verify descending date order
      for (let i = 1; i < body.items.length; i++) {
        expect(
          new Date(body.items[i - 1].date) >= new Date(body.items[i].date),
        ).toBe(true);
      }
    });

    it('limit=2 pagination produces no duplicate ids across pages', async () => {
      // Use the timeline member seeded above (3 sessions + joined = 4 items)
      const page1Res = await request(app.getHttpServer())
        .get('/journey/timeline?limit=2')
        .set('Authorization', `Bearer ${timelineMemberToken}`)
        .expect(200);

      const page1 = page1Res.body as { items: JourneyTimelineItem[]; nextCursor: string | null };
      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).not.toBeNull();

      const page2Res = await request(app.getHttpServer())
        .get(`/journey/timeline?limit=2&cursor=${encodeURIComponent(page1.nextCursor!)}`)
        .set('Authorization', `Bearer ${timelineMemberToken}`)
        .expect(200);

      const page2 = page2Res.body as { items: JourneyTimelineItem[]; nextCursor: string | null };
      expect(page2.items.length).toBeGreaterThan(0);

      // No duplicate ids across the two pages
      const page1Ids = new Set(page1.items.map((i) => i.id));
      for (const item of page2.items) {
        expect(page1Ids.has(item.id)).toBe(false);
      }
    });

    it('limit > 50 → 400 (validation)', async () => {
      await request(app.getHttpServer())
        .get('/journey/timeline?limit=51')
        .set('Authorization', `Bearer ${emptyMemberToken}`)
        .expect(400);
    });
  });
});

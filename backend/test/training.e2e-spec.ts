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
import { PlanTemplatesModule } from '../src/modules/plan-templates/plan-templates.module';
import { TrainingModule } from '../src/modules/training/training.module';
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
  PlanTemplate,
  PlanTemplateSchema,
  PlanTemplateDocument,
} from '../src/common/models/plan-template.model';

const OWNER_EMAIL = 'tr-e2e-owner@example.com';
const TRAINER_EMAIL = 'tr-e2e-trainer@example.com';
const OTHER_TRAINER_EMAIL = 'tr-e2e-other-trainer@example.com';
const MEMBER_EMAIL = 'tr-e2e-member@example.com';
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
        { name: PlanTemplate.name, schema: PlanTemplateSchema },
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
      PlanTemplatesModule,
      TrainingModule,
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

describe('Training (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let planTemplateModel: Model<PlanTemplateDocument>;
  let ownerToken: string;
  let trainerToken: string;
  let otherTrainerToken: string;
  let memberToken: string;
  let memberId: string;
  let otherMemberId: string;
  let templateId: string;

  const exerciseId = new Types.ObjectId();

  const validDay = {
    dayNumber: 1,
    name: 'Day 1',
    exercises: [
      {
        groupId: 'g1',
        isSuperset: false,
        exerciseId: exerciseId.toString(),
        exerciseName: 'Bench Press',
        imageUrl: null,
        isBodyweight: false,
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        restSeconds: 60,
      },
    ],
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    planTemplateModel = module.get<Model<PlanTemplateDocument>>(
      getModelToken(PlanTemplate.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const owner = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'TR',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    const trainer = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'TR',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'TR',
      lastName: 'OtherTrainer',
      email: OTHER_TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    const member = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'TR',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: trainer._id,
    });
    memberId = member._id.toString();

    // Another member that belongs to owner, not trainer
    const otherMember = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'TR',
      lastName: 'OtherMember',
      email: 'tr-e2e-other-member@example.com',
      passwordHash,
      role: 'member',
      trainerId: owner._id,
    });
    otherMemberId = otherMember._id.toString();

    // Create a plan template owned by owner
    const template = await planTemplateModel.create({
      name: 'E2E Push Day',
      description: null,
      days: [
        {
          dayNumber: 1,
          name: 'Day 1',
          exercises: [
            {
              groupId: 'g1',
              isSuperset: false,
              exerciseId,
              exerciseName: 'Bench Press',
              imageUrl: null,
              isBodyweight: false,
              sets: 3,
              repsMin: 8,
              repsMax: 12,
              restSeconds: 60,
            },
          ],
        },
      ],
      createdBy: owner._id,
    });
    templateId = template._id.toString();

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

    const otherTrainerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: OTHER_TRAINER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    otherTrainerToken = (otherTrainerLogin.body as { accessToken: string })
      .accessToken;

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

  // ─── GET /training/my-plan ────────────────────────────────────────────────────

  describe('GET /training/my-plan', () => {
    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/training/my-plan').expect(401);
    });

    it('owner token → 403', async () => {
      await request(app.getHttpServer())
        .get('/training/my-plan')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('member token with no plan → 200 and body null', async () => {
      const res = await request(app.getHttpServer())
        .get('/training/my-plan')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body).toBeNull();
    });
  });

  // ─── POST /training/members/:memberId/assign-plan ─────────────────────────────

  describe('POST /training/members/:memberId/assign-plan', () => {
    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .post(`/training/members/${memberId}/assign-plan`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ templateId })
        .expect(403);
    });

    it('missing templateId → 400', async () => {
      await request(app.getHttpServer())
        .post(`/training/members/${memberId}/assign-plan`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(400);
    });

    it('unknown templateId → 404', async () => {
      await request(app.getHttpServer())
        .post(`/training/members/${memberId}/assign-plan`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ templateId: new Types.ObjectId().toString() })
        .expect(404);
    });

    it('owner token + valid templateId → 201 returns ActivePlan with days', async () => {
      const res = await request(app.getHttpServer())
        .post(`/training/members/${memberId}/assign-plan`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ templateId })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('name', 'E2E Push Day');
      expect(Array.isArray(body.days)).toBe(true);
      expect((body.days as unknown[]).length).toBe(1);
    });

    it('after assign, GET /training/my-plan as that member → 200 returns plan name', async () => {
      const res = await request(app.getHttpServer())
        .get('/training/my-plan')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('name', 'E2E Push Day');
    });

    it('trainer not owning member → 404 (trainer template scoping)', async () => {
      // trainer does not own otherMember; also trainer does not own the template
      // Let's test trainer assigning to a member who belongs to another trainer
      const res = await request(app.getHttpServer())
        .post(`/training/members/${otherMemberId}/assign-plan`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ templateId })
        .expect(404);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /training/dev/seed ──────────────────────────────────────────────────

  describe('POST /training/dev/seed', () => {
    it('seeds a plan for the member without a completed session', async () => {
      const res = await request(app.getHttpServer())
        .post('/training/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          ownerEmail: OWNER_EMAIL,
          templateId,
        })
        .expect(200);

      expect((res.body as Record<string, unknown>).ok).toBe(true);
    });

    it('seeds a plan with a completed session when seedCompletedSession=true', async () => {
      const res = await request(app.getHttpServer())
        .post('/training/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          ownerEmail: OWNER_EMAIL,
          templateId,
          seedCompletedSession: true,
        })
        .expect(200);

      expect((res.body as Record<string, unknown>).ok).toBe(true);
    });
  });

  // ─── POST /training/sessions ──────────────────────────────────────────────────

  describe('POST /training/sessions', () => {
    it('member token with dayNumber from assigned plan → 201 returns session with correct sets', async () => {
      // Ensure member has an active plan (seed again to ensure clean state)
      await request(app.getHttpServer())
        .post('/training/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          ownerEmail: OWNER_EMAIL,
          templateId,
        })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/training/sessions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ dayNumber: 1 })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('dayNumber', 1);
      expect(body).toHaveProperty('dayName', 'Day 1');
      // 3 sets total (1 exercise × 3 sets)
      const sets = body.sets as unknown[];
      expect(sets.length).toBe(3);
      const firstSet = sets[0] as Record<string, unknown>;
      expect(firstSet.actualReps).toBeNull();
      expect(firstSet.actualWeight).toBeNull();
    });

    it('invalid dayNumber → 404', async () => {
      await request(app.getHttpServer())
        .post('/training/sessions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ dayNumber: 999 })
        .expect(404);
    });
  });

  // ─── PATCH /training/sessions/:id/sets ────────────────────────────────────────

  describe('PATCH /training/sessions/:id/sets', () => {
    let sessionId: string;

    beforeAll(async () => {
      // Start a session
      const res = await request(app.getHttpServer())
        .post('/training/sessions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ dayNumber: 1 })
        .expect(201);
      sessionId = (res.body as { _id: string })._id;
    });

    it('valid set patch → 200, returned session has the set with actualReps set', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/training/sessions/${sessionId}/sets`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          setNumber: 1,
          exerciseId: exerciseId.toString(),
          actualReps: 10,
          actualWeight: 80,
        })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      const sets = body.sets as Array<Record<string, unknown>>;
      const patchedSet = sets.find(
        (s) => s.setNumber === 1 && s.exerciseId === exerciseId.toString(),
      );
      expect(patchedSet).toBeDefined();
      expect(patchedSet?.actualReps).toBe(10);
      expect(patchedSet?.completedAt).not.toBeNull();
    });
  });

  // ─── POST /training/sessions/:id/finish ───────────────────────────────────────

  describe('POST /training/sessions/:id/finish', () => {
    let sessionId: string;

    beforeAll(async () => {
      // Start a fresh session
      const res = await request(app.getHttpServer())
        .post('/training/sessions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ dayNumber: 1 })
        .expect(201);
      sessionId = (res.body as { _id: string })._id;
    });

    it('finish session → 200 with completedAt != null', async () => {
      const res = await request(app.getHttpServer())
        .post(`/training/sessions/${sessionId}/finish`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body.completedAt).not.toBeNull();
    });

    it('second finish call → 400', async () => {
      await request(app.getHttpServer())
        .post(`/training/sessions/${sessionId}/finish`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);
    });
  });

  // ─── GET /training/members/:memberId/history ──────────────────────────────────

  describe('GET /training/members/:memberId/history', () => {
    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/history`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('trainer not owning member → 404', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${otherMemberId}/history`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(404);
    });

    it('owner → 200 array containing the finished session', async () => {
      const res = await request(app.getHttpServer())
        .get(`/training/members/${memberId}/history`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const sessions = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(sessions)).toBe(true);
      // At least one completed session from the finish test above
      const completedSession = sessions.find((s) => s.completedAt !== null);
      expect(completedSession).toBeDefined();
    });

    it('trainer owning member → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/training/members/${memberId}/history`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('other trainer (not owning member) → 404', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/history`)
        .set('Authorization', `Bearer ${otherTrainerToken}`)
        .expect(404);
    });
  });

  // ─── Template scoping: trainer can only use their own templates ───────────────

  describe('trainer template ownership', () => {
    it("trainer assigning owner's template to their own member → 404 (template not owned)", async () => {
      // templateId is owned by owner, not trainer
      await request(app.getHttpServer())
        .post(`/training/members/${memberId}/assign-plan`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ templateId })
        .expect(404);
    });

    it('trainer assigning their own template to their own member → 201', async () => {
      // Create a template as trainer
      const createRes = await request(app.getHttpServer())
        .post('/plan-templates')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Trainer Template',
          description: null,
          days: [
            {
              dayNumber: 1,
              name: 'Trainer Day 1',
              exercises: [
                {
                  groupId: 'g1',
                  isSuperset: false,
                  exerciseId: exerciseId.toString(),
                  exerciseName: 'Squat',
                  imageUrl: null,
                  isBodyweight: false,
                  sets: 2,
                  repsMin: 5,
                  repsMax: 8,
                  restSeconds: 120,
                },
              ],
            },
          ],
        })
        .expect(201);

      const trainerTemplateId = (createRes.body as { _id: string })._id;

      const res = await request(app.getHttpServer())
        .post(`/training/members/${memberId}/assign-plan`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ templateId: trainerTemplateId })
        .expect(201);

      expect((res.body as Record<string, unknown>).name).toBe(
        'Trainer Template',
      );
    });
  });

  // ─── GET /training/members/:memberId/progress ─────────────────────────────────

  describe('GET /training/members/:memberId/progress', () => {
    beforeAll(async () => {
      // Ensure at least one completed session exists for the member
      await request(app.getHttpServer())
        .post('/training/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          ownerEmail: OWNER_EMAIL,
          templateId,
          seedCompletedSession: true,
        })
        .expect(200);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/progress`)
        .expect(401);
    });

    it('member role → 403', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/progress`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('trainer NOT assigned to member → 404', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/progress`)
        .set('Authorization', `Bearer ${otherTrainerToken}`)
        .expect(404);
    });

    it("member's trainer → 200 with heatmapDates and exercises arrays", async () => {
      const res = await request(app.getHttpServer())
        .get(`/training/members/${memberId}/progress`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const body = res.body as {
        heatmapDates: string[];
        exercises: { exerciseId: string; exerciseName: string }[];
      };
      expect(Array.isArray(body.heatmapDates)).toBe(true);
      expect(Array.isArray(body.exercises)).toBe(true);
      // At least one completed session was seeded today
      expect(body.heatmapDates.length).toBeGreaterThanOrEqual(1);
      // Bench Press exercise should appear
      const benchPress = body.exercises.find(
        (e) => e.exerciseName === 'Bench Press',
      );
      expect(benchPress).toBeDefined();
      expect(benchPress?.exerciseId).toBe(exerciseId.toString());
    });
  });

  // ─── GET /training/members/:memberId/exercise/:exerciseId ─────────────────────

  describe('GET /training/members/:memberId/exercise/:exerciseId', () => {
    it("member's trainer → 200 with sessions array with numeric estimatedOneRepMax", async () => {
      const res = await request(app.getHttpServer())
        .get(`/training/members/${memberId}/exercise/${exerciseId.toString()}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const body = res.body as {
        exerciseId: string;
        exerciseName: string;
        sessions: {
          sessionId: string;
          date: string;
          sets: { setNumber: number; weight: number; reps: number }[];
          estimatedOneRepMax: number;
        }[];
      };
      expect(body.exerciseId).toBe(exerciseId.toString());
      expect(Array.isArray(body.sessions)).toBe(true);
      expect(body.sessions.length).toBeGreaterThanOrEqual(1);
      const session = body.sessions[0];
      expect(typeof session.estimatedOneRepMax).toBe('number');
      // Seeded sets: weight=80, reps=10 → 1RM = round(80 * (1 + 10/30)) = round(106.67) = 107
      expect(session.estimatedOneRepMax).toBe(107);
      expect(session.sets.length).toBeGreaterThanOrEqual(1);
    });

    it('owner → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/training/members/${memberId}/exercise/${exerciseId.toString()}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(
        Array.isArray((res.body as { sessions: unknown[] }).sessions),
      ).toBe(true);
    });
  });

  // ─── GET /training/members/:memberId/plan ─────────────────────────────────────

  describe('GET /training/members/:memberId/plan', () => {
    beforeAll(async () => {
      // Ensure member has an active plan via dev seed
      await request(app.getHttpServer())
        .post('/training/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          ownerEmail: OWNER_EMAIL,
          templateId,
        })
        .expect(200);
    });

    it('assigned trainer → 200 with active plan body (name + days)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/training/members/${memberId}/plan`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('name', 'E2E Push Day');
      expect(Array.isArray(body.days)).toBe(true);
    });

    it('member role → 403', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/plan`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('other-trainer (member not theirs) → 404', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/plan`)
        .set('Authorization', `Bearer ${otherTrainerToken}`)
        .expect(404);
    });
  });

  // ─── POST /training/members/:memberId/sessions ────────────────────────────────

  describe('POST /training/members/:memberId/sessions', () => {
    it('assigned trainer with { dayNumber: 1 } → 201 with WorkoutSession where loggedBy equals trainer id', async () => {
      // Ensure member has an active plan
      await request(app.getHttpServer())
        .post('/training/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          ownerEmail: OWNER_EMAIL,
          templateId,
        })
        .expect(200);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TRAINER_EMAIL, password: TEST_PASSWORD })
        .expect(201);
      const trainerId = (
        loginRes.body as { accessToken: string; user: { id: string } }
      ).user.id;

      const res = await request(app.getHttpServer())
        .post(`/training/members/${memberId}/sessions`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ dayNumber: 1 })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('dayNumber', 1);
      expect(body.loggedBy).toBe(trainerId);
    });
  });

  // ─── PATCH /training/members/:memberId/sessions/:id/sets ─────────────────────

  describe('PATCH /training/members/:memberId/sessions/:id/sets', () => {
    let trainerSessionId: string;

    beforeAll(async () => {
      // Ensure member has an active plan
      await request(app.getHttpServer())
        .post('/training/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          ownerEmail: OWNER_EMAIL,
          templateId,
        })
        .expect(200);

      // Start a trainer session
      const res = await request(app.getHttpServer())
        .post(`/training/members/${memberId}/sessions`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ dayNumber: 1 })
        .expect(201);
      trainerSessionId = (res.body as { _id: string })._id;
    });

    it('assigned trainer with valid set → 200 and that set has non-null completedAt', async () => {
      const res = await request(app.getHttpServer())
        .patch(
          `/training/members/${memberId}/sessions/${trainerSessionId}/sets`,
        )
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          setNumber: 1,
          exerciseId: exerciseId.toString(),
          actualReps: 10,
          actualWeight: 80,
        })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      const sets = body.sets as Array<Record<string, unknown>>;
      const patchedSet = sets.find(
        (s) => s.setNumber === 1 && s.exerciseId === exerciseId.toString(),
      );
      expect(patchedSet).toBeDefined();
      expect(patchedSet?.completedAt).not.toBeNull();
    });
  });

  // ─── POST /training/members/:memberId/sessions/:id/finish ─────────────────────

  describe('POST /training/members/:memberId/sessions/:id/finish', () => {
    let trainerFinishSessionId: string;

    beforeAll(async () => {
      // Ensure member has an active plan
      await request(app.getHttpServer())
        .post('/training/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          ownerEmail: OWNER_EMAIL,
          templateId,
        })
        .expect(200);

      // Start a trainer session for finishing
      const res = await request(app.getHttpServer())
        .post(`/training/members/${memberId}/sessions`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ dayNumber: 1 })
        .expect(201);
      trainerFinishSessionId = (res.body as { _id: string })._id;
    });

    it('assigned trainer → 200 and session has non-null completedAt', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/training/members/${memberId}/sessions/${trainerFinishSessionId}/finish`,
        )
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body.completedAt).not.toBeNull();
    });

    it('already-finished session → 400', async () => {
      await request(app.getHttpServer())
        .post(
          `/training/members/${memberId}/sessions/${trainerFinishSessionId}/finish`,
        )
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(400);
    });
  });

  // ─── validDay is used ─────────────────────────────────────────────────────────
  // Reference to silence unused var lint warning:
  void validDay;
});

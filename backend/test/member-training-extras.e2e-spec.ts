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
import { TrainingModule } from '../src/modules/training/training.module';
import { PlanTemplatesModule } from '../src/modules/plan-templates/plan-templates.module';
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
  PersonalBest,
  PersonalBestSchema,
  PersonalBestDocument,
} from '../src/common/models/personal-best.model';
import {
  WorkoutSession,
  WorkoutSessionSchema,
  WorkoutSessionDocument,
} from '../src/common/models/workout-session.model';

const OWNER_EMAIL = 'mte-e2e-owner@example.com';
const TRAINER_EMAIL = 'mte-e2e-trainer@example.com';
const OTHER_TRAINER_EMAIL = 'mte-e2e-other-trainer@example.com';
const MEMBER_EMAIL = 'mte-e2e-member@example.com';
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
        { name: PersonalBest.name, schema: PersonalBestSchema },
        { name: WorkoutSession.name, schema: WorkoutSessionSchema },
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

describe('Member Training Extras (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let personalBestModel: Model<PersonalBestDocument>;
  let workoutSessionModel: Model<WorkoutSessionDocument>;
  let ownerToken: string;
  let trainerToken: string;
  let otherTrainerToken: string;
  let memberId: string;
  let ownedMemberId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    personalBestModel = module.get<Model<PersonalBestDocument>>(
      getModelToken(PersonalBest.name),
    );
    workoutSessionModel = module.get<Model<WorkoutSessionDocument>>(
      getModelToken(WorkoutSession.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const owner = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'MTE',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    const trainer = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'MTE',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'MTE',
      lastName: 'OtherTrainer',
      email: OTHER_TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    const member = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'MTE',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: trainer._id,
    });
    memberId = member._id.toString();

    // Member owned by owner directly (not a trainer's member)
    const ownedMember = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'MTE',
      lastName: 'OwnedMember',
      email: 'mte-e2e-owned-member@example.com',
      passwordHash,
      role: 'member',
      trainerId: owner._id,
    });
    ownedMemberId = ownedMember._id.toString();

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
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── GET /training/members/:memberId/personal-bests ───────────────────────────

  describe('GET /training/members/:memberId/personal-bests', () => {
    const exerciseId1 = new Types.ObjectId();
    const exerciseId2 = new Types.ObjectId();

    beforeAll(async () => {
      // Seed two PRs for the member
      await personalBestModel.create([
        {
          memberId: new Types.ObjectId(memberId),
          exerciseId: exerciseId1,
          exerciseName: 'Back Squat',
          bestWeight: 140,
          bestReps: 3,
          estimatedOneRM: 154,
          achievedAt: new Date(),
          sessionId: new Types.ObjectId(),
        },
        {
          memberId: new Types.ObjectId(memberId),
          exerciseId: exerciseId2,
          exerciseName: 'Bench Press',
          bestWeight: 100,
          bestReps: 5,
          estimatedOneRM: 117,
          achievedAt: new Date(),
          sessionId: new Types.ObjectId(),
        },
      ]);
    });

    it('unauthenticated → 401', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/personal-bests`)
        .expect(401);
    });

    it('owner → 200 with PRs sorted by estimatedOneRM desc', async () => {
      const res = await request(app.getHttpServer())
        .get(`/training/members/${memberId}/personal-bests`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as {
        exerciseName: string;
        estimatedOneRM: number;
      }[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      // Sorted descending by estimatedOneRM
      expect(body[0].estimatedOneRM).toBeGreaterThanOrEqual(
        body[1].estimatedOneRM,
      );
      expect(body[0].exerciseName).toBe('Back Squat');
    });

    it('trainer not owning member → 404', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/personal-bests`)
        .set('Authorization', `Bearer ${otherTrainerToken}`)
        .expect(404);
    });
  });

  // ─── GET /training/members/:memberId/active-session ───────────────────────────

  describe('GET /training/members/:memberId/active-session', () => {
    it('unauthenticated → 401', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/active-session`)
        .expect(401);
    });

    it('no in-progress session → 200 with null body', async () => {
      const res = await request(app.getHttpServer())
        .get(`/training/members/${memberId}/active-session`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(res.body).toBeNull();
    });

    it('with in-progress session → 200 returns session with completedAt null', async () => {
      const memberObjId = new Types.ObjectId(memberId);
      await workoutSessionModel.create({
        memberId: memberObjId,
        memberPlanId: new Types.ObjectId(),
        dayNumber: 1,
        dayName: 'Push Day',
        startedAt: new Date(),
        completedAt: null,
        lastActivityAt: new Date(),
        autoSealed: false,
        sets: [],
        loggedBy: null,
        rpe: null,
        memberNote: null,
      });

      const res = await request(app.getHttpServer())
        .get(`/training/members/${memberId}/active-session`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const body = res.body as { dayName: string; completedAt: null };
      expect(body).not.toBeNull();
      expect(body.dayName).toBe('Push Day');
      expect(body.completedAt).toBeNull();
    });

    it('trainer not owning member → 404', async () => {
      await request(app.getHttpServer())
        .get(`/training/members/${memberId}/active-session`)
        .set('Authorization', `Bearer ${otherTrainerToken}`)
        .expect(404);
    });
  });
});

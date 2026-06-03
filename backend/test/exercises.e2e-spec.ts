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
import { ExercisesModule } from '../src/modules/exercises/exercises.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  Exercise,
  ExerciseSchema,
  ExerciseDocument,
} from '../src/common/models/exercise.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'ex-e2e-owner@example.com';
const TRAINER_EMAIL = 'ex-e2e-trainer@example.com';
const OTHER_TRAINER_EMAIL = 'ex-e2e-other-trainer@example.com';
const MEMBER_EMAIL = 'ex-e2e-member@example.com';
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
        { name: Exercise.name, schema: ExerciseSchema },
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
      ExercisesModule,
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

describe('Exercises (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let exerciseModel: Model<ExerciseDocument>;
  let ownerToken: string;
  let trainerToken: string;
  let memberToken: string;
  let ownerId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    exerciseModel = module.get<Model<ExerciseDocument>>(
      getModelToken(Exercise.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const ownerDoc = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Ex',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });
    ownerId = ownerDoc._id.toString();

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Ex',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Ex',
      lastName: 'OtherTrainer',
      email: OTHER_TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Ex',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: null,
    });

    // Seed a global exercise called "Bench Press"
    await exerciseModel.create({
      name: 'Bench Press',
      muscleGroup: 'chest',
      isGlobal: true,
      createdBy: null,
      imageUrl: null,
      isBodyweight: false,
      equipmentIds: [],
      bodyParts: [],
    });

    // Seed a private exercise for "other trainer" called "Bench Variation"
    const otherTrainerDoc = await userModel.findOne({
      email: OTHER_TRAINER_EMAIL,
    });
    await exerciseModel.create({
      name: 'Bench Variation',
      muscleGroup: null,
      isGlobal: false,
      createdBy: otherTrainerDoc!._id,
      imageUrl: null,
      isBodyweight: false,
      equipmentIds: [],
      bodyParts: [],
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

  // ─── GET /exercises ───────────────────────────────────────────────────────────

  describe('GET /exercises', () => {
    it('owner q=bench → 200 returns global + own exercises matching "bench", excludes another user\'s private exercises', async () => {
      // Owner has no own exercises yet. Only global "Bench Press" should match.
      const res = await request(app.getHttpServer())
        .get('/exercises?q=bench')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const exercises = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(exercises)).toBe(true);
      const names = exercises.map((e) => e.name);
      expect(names).toContain('Bench Press');
      // Other trainer's "Bench Variation" must not appear for owner
      expect(names).not.toContain('Bench Variation');
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/exercises').expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get('/exercises')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── POST /exercises ──────────────────────────────────────────────────────────

  describe('POST /exercises', () => {
    it('trainer with { name, muscleGroup, isBodyweight } → 201, response has isGlobal false and createdBy equal to the trainer', async () => {
      const res = await request(app.getHttpServer())
        .post('/exercises')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Custom Curl',
          muscleGroup: 'bicep',
          isBodyweight: false,
        })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('isGlobal', false);
      expect(body).toHaveProperty('name', 'Custom Curl');
      // createdBy should not be null or the owner's id
      expect(body.createdBy).not.toBeNull();
      expect(body.createdBy).not.toBe(ownerId);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .post('/exercises')
        .send({ name: 'Test', muscleGroup: null, isBodyweight: false })
        .expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .post('/exercises')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Test', muscleGroup: null, isBodyweight: false })
        .expect(403);
    });
  });

  // ─── POST /exercises/dev/seed-global ─────────────────────────────────────────

  describe('POST /exercises/dev/seed-global', () => {
    it('seeds a global exercise by name and returns { ok: true }', async () => {
      const res = await request(app.getHttpServer())
        .post('/exercises/dev/seed-global')
        .send({ name: 'Seeded Deadlift' })
        .expect(200);

      expect((res.body as { ok: boolean }).ok).toBe(true);

      // Verify it appears in search
      const searchRes = await request(app.getHttpServer())
        .get('/exercises?q=Seeded')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const names = (searchRes.body as Array<Record<string, unknown>>).map(
        (e) => e.name,
      );
      expect(names).toContain('Seeded Deadlift');
    });
  });
});

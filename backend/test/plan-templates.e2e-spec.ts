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

const OWNER_EMAIL = 'pt-e2e-owner@example.com';
const TRAINER_EMAIL = 'pt-e2e-trainer@example.com';
const OTHER_TRAINER_EMAIL = 'pt-e2e-other-trainer@example.com';
const MEMBER_EMAIL = 'pt-e2e-member@example.com';
const TEST_PASSWORD = 'Password1';

const validDay = {
  dayNumber: 1,
  name: 'Day 1',
  exercises: [
    {
      groupId: 'g1',
      isSuperset: false,
      exerciseId: new Types.ObjectId().toString(),
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

const validCreateBody = {
  name: 'Push Day Template',
  description: 'A push day',
  days: [validDay],
};

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
      PlanTemplatesModule,
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

describe('PlanTemplates (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let ownerToken: string;
  let trainerToken: string;
  let otherTrainerToken: string;
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
      firstName: 'PT',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'PT',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'PT',
      lastName: 'OtherTrainer',
      email: OTHER_TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'PT',
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

  // ─── POST /plan-templates ─────────────────────────────────────────────────────

  describe('POST /plan-templates', () => {
    it('owner with valid body → 201 and response includes _id, name, and days', async () => {
      const res = await request(app.getHttpServer())
        .post('/plan-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validCreateBody)
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('name', 'Push Day Template');
      expect(Array.isArray(body.days)).toBe(true);
      expect((body.days as unknown[]).length).toBe(1);
    });

    it('missing required name → 400', async () => {
      await request(app.getHttpServer())
        .post('/plan-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ description: 'no name', days: [] })
        .expect(400);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .post('/plan-templates')
        .send(validCreateBody)
        .expect(401);
    });
  });

  // ─── GET /plan-templates ──────────────────────────────────────────────────────

  describe('GET /plan-templates', () => {
    it("trainer → 200 returns only templates created by that trainer (not another user's templates)", async () => {
      // Create a template as trainer
      const createRes = await request(app.getHttpServer())
        .post('/plan-templates')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Trainer Template', description: null, days: [] })
        .expect(201);
      const createdId = (createRes.body as { _id: string })._id;

      // Create a template as otherTrainer (should not appear for trainer)
      await request(app.getHttpServer())
        .post('/plan-templates')
        .set('Authorization', `Bearer ${otherTrainerToken}`)
        .send({ name: 'Other Trainer Template', description: null, days: [] })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/plan-templates')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const templates = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(templates)).toBe(true);
      const ids = templates.map((t) => t._id);
      expect(ids).toContain(createdId);
      // Should not contain other trainer's template
      const names = templates.map((t) => t.name);
      expect(names).not.toContain('Other Trainer Template');
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/plan-templates').expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get('/plan-templates')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── PATCH /plan-templates/:id ────────────────────────────────────────────────

  describe('PATCH /plan-templates/:id', () => {
    let templateId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/plan-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'To Update', description: null, days: [validDay] })
        .expect(201);
      templateId = (res.body as { _id: string })._id;
    });

    it('owning user with new days array → 200 and returned days match the new array exactly', async () => {
      const newDays = [
        { dayNumber: 1, name: 'New Day 1', exercises: [] },
        { dayNumber: 2, name: 'New Day 2', exercises: [] },
      ];

      const res = await request(app.getHttpServer())
        .patch(`/plan-templates/${templateId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated Name', description: 'updated', days: newDays })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('name', 'Updated Name');
      const days = body.days as Array<Record<string, unknown>>;
      expect(days).toHaveLength(2);
      expect(days[0]).toHaveProperty('name', 'New Day 1');
      expect(days[1]).toHaveProperty('name', 'New Day 2');
    });

    it('template owned by another user → 404', async () => {
      await request(app.getHttpServer())
        .patch(`/plan-templates/${templateId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Hacked', description: null, days: [] })
        .expect(404);
    });
  });

  // ─── DELETE /plan-templates/:id ───────────────────────────────────────────────

  describe('DELETE /plan-templates/:id', () => {
    it('template owned by another user → 404 (ownership enforced)', async () => {
      // Owner creates a template
      const createRes = await request(app.getHttpServer())
        .post('/plan-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: "Owner's Template", description: null, days: [] })
        .expect(201);
      const templateId = (createRes.body as { _id: string })._id;

      // Trainer tries to delete it — should get 404
      await request(app.getHttpServer())
        .delete(`/plan-templates/${templateId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(404);
    });

    it('owning user deletes their own template → 204', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/plan-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Delete Me', description: null, days: [] })
        .expect(201);
      const templateId = (createRes.body as { _id: string })._id;

      await request(app.getHttpServer())
        .delete(`/plan-templates/${templateId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });
  });
});

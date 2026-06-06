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
import { TrainersModule } from '../src/modules/trainers/trainers.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  PlanTemplate,
  PlanTemplateSchema,
  PlanTemplateDocument,
} from '../src/common/models/plan-template.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'trainers-e2e-owner@example.com';
const TRAINER1_EMAIL = 'trainers-e2e-trainer1@example.com';
const TRAINER2_EMAIL = 'trainers-e2e-trainer2@example.com';
const MEMBER_EMAIL = 'trainers-e2e-member@example.com';
const MEMBER_ROLE_EMAIL = 'trainers-e2e-memberrole@example.com';
const TRAINER1_LOGIN_EMAIL = 'trainers-e2e-trainer1-login@example.com';
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
      TrainersModule,
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

describe('Trainers (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let planTemplateModel: Model<PlanTemplateDocument>;
  let ownerToken: string;
  let memberToken: string;
  let trainerToken: string;
  let trainer1Id: string;
  let trainer2Id: string;
  let member1Id: string;

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

    // Create owner
    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Test',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    // Create trainer1 (will have 2 members)
    const trainer1Doc = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Jane',
      lastName: 'Trainer',
      email: TRAINER1_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });
    trainer1Id = trainer1Doc._id.toString();

    // Create trainer2 (will have 0 members, used as reassign target)
    const trainer2Doc = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Bob',
      lastName: 'Coach',
      email: TRAINER2_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });
    trainer2Id = trainer2Doc._id.toString();

    // Create a trainer that can log in (to test 403 on trainer-role)
    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Login',
      lastName: 'Trainer',
      email: TRAINER1_LOGIN_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    // Create 2 members assigned to trainer1
    const member1Doc = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Alice',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: new Types.ObjectId(trainer1Id),
    });
    member1Id = member1Doc._id.toString();

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Charlie',
      lastName: 'User',
      email: 'charlie@example.com',
      passwordHash,
      role: 'member',
      trainerId: new Types.ObjectId(trainer1Id),
    });

    // Create a member-role user for auth checks
    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Regular',
      lastName: 'Member',
      email: MEMBER_ROLE_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: null,
    });

    // Seed a plan template created by trainer1
    await planTemplateModel.create({
      _id: new Types.ObjectId(),
      name: 'Trainer1 Strength Plan',
      description: null,
      createdBy: new Types.ObjectId(trainer1Id),
      days: [
        { dayNumber: 1, name: 'Push Day', exercises: [] },
        { dayNumber: 2, name: 'Pull Day', exercises: [] },
      ],
    });

    // Login owner
    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: OWNER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    ownerToken = (ownerLogin.body as { accessToken: string }).accessToken;

    // Login member
    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: MEMBER_ROLE_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    memberToken = (memberLogin.body as { accessToken: string }).accessToken;

    // Login trainer
    const trainerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TRAINER1_LOGIN_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    trainerToken = (trainerLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── GET /trainers ────────────────────────────────────────────────────────────

  describe('GET /trainers', () => {
    it('owner → 200 with array where each item has id, name, email, memberCount and memberCount matches seeded assignments', async () => {
      const res = await request(app.getHttpServer())
        .get('/trainers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const trainers = res.body as Array<Record<string, unknown>>;

      const trainer1 = trainers.find((t) => t.id === trainer1Id);
      const trainer2 = trainers.find((t) => t.id === trainer2Id);

      expect(trainer1).toBeDefined();
      expect(trainer1).toHaveProperty('name', 'Jane Trainer');
      expect(trainer1).toHaveProperty('email', TRAINER1_EMAIL);
      expect(trainer1).toHaveProperty('memberCount', 2);

      expect(trainer2).toBeDefined();
      expect(trainer2).toHaveProperty('name', 'Bob Coach');
      expect(trainer2).toHaveProperty('email', TRAINER2_EMAIL);
      expect(trainer2).toHaveProperty('memberCount', 0);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/trainers').expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get('/trainers')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── GET /trainers/:id ────────────────────────────────────────────────────────

  describe('GET /trainers/:id', () => {
    it('owner → 200 with id, name, email, memberCount, joinDate, members[] containing exactly the seeded members', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trainers/${trainer1Id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('id', trainer1Id);
      expect(body).toHaveProperty('name', 'Jane Trainer');
      expect(body).toHaveProperty('email', TRAINER1_EMAIL);
      expect(body).toHaveProperty('memberCount', 2);
      expect(body).toHaveProperty('joinDate');
      expect(typeof body.joinDate).toBe('string');

      const members = body.members as Array<Record<string, unknown>>;
      expect(Array.isArray(members)).toBe(true);
      expect(members).toHaveLength(2);
      expect(members[0]).toHaveProperty('id');
      expect(members[0]).toHaveProperty('name');
      expect(members[0]).toHaveProperty('email');
    });

    it('owner with non-trainer id → 404', async () => {
      const nonTrainerId = new Types.ObjectId().toString();
      await request(app.getHttpServer())
        .get(`/trainers/${nonTrainerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .get(`/trainers/${trainer1Id}`)
        .expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get(`/trainers/${trainer1Id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── GET /trainers/:id/members ────────────────────────────────────────────────

  describe('GET /trainers/:id/members', () => {
    it('owner → 200 with members carrying numeric streak and sessionsThisMonth and a valid status', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trainers/${trainer1Id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);

      const member = body[0];
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('name');
      expect(member).toHaveProperty('email');
      expect(typeof member.streak).toBe('number');
      expect(typeof member.sessionsThisMonth).toBe('number');
      expect(['active', 'needs-attn', 'no-plan']).toContain(member.status);
    });

    it('no JWT → 401', async () => {
      await request(app.getHttpServer())
        .get(`/trainers/${trainer1Id}/members`)
        .expect(401);
    });
  });

  // ─── GET /trainers/:id/training-plans ─────────────────────────────────────────

  describe('GET /trainers/:id/training-plans', () => {
    it("owner → 200 with only that trainer's templates", async () => {
      const res = await request(app.getHttpServer())
        .get(`/trainers/${trainer1Id}/training-plans`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);

      const plan = body[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name', 'Trainer1 Strength Plan');
      expect(plan).toHaveProperty('dayCount', 2);
      expect(plan).toHaveProperty('createdAt');
    });

    it('trainer2 (no templates) → 200 with empty array', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trainers/${trainer2Id}/training-plans`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  // ─── GET /trainers/:id/sessions as trainer role → 403 ────────────────────────

  describe('GET /trainers/:id/sessions', () => {
    it('trainer role → 403', async () => {
      await request(app.getHttpServer())
        .get(`/trainers/${trainer1Id}/sessions`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(403);
    });
  });

  // ─── PATCH /trainers/:id/members/:memberId/reassign ───────────────────────────

  describe('PATCH /trainers/:id/members/:memberId/reassign', () => {
    it('owner with valid target trainer → 200 and follow-up GET includes member in new trainer list', async () => {
      // Reassign member1 from trainer1 to trainer2
      await request(app.getHttpServer())
        .patch(`/trainers/${trainer1Id}/members/${member1Id}/reassign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ trainerId: trainer2Id })
        .expect(200);

      // Verify member now appears under trainer2
      const res = await request(app.getHttpServer())
        .get(`/trainers/${trainer2Id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const members = res.body as Array<{ id: string }>;
      expect(members.some((m) => m.id === member1Id)).toBe(true);
    });

    it('wrong current trainer → 404', async () => {
      const nonMemberId = new Types.ObjectId().toString();
      await request(app.getHttpServer())
        .patch(`/trainers/${trainer1Id}/members/${nonMemberId}/reassign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ trainerId: trainer2Id })
        .expect(404);
    });
  });

  // ─── GET /trainers/:id/overview-stats ─────────────────────────────────────────

  describe('GET /trainers/:id/overview-stats', () => {
    it('as owner → 200 with all KPI + chart keys present', async () => {
      const res = await request(app.getHttpServer())
        .get(`/trainers/${trainer1Id}/overview-stats`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('memberCount');
      expect(body).toHaveProperty('sessionsThisMonth');
      expect(body).toHaveProperty('templateCount');
      expect(body).toHaveProperty('activeMembersThisMonth');
      expect(body).toHaveProperty('newPRsThisMonth');
      expect(body).toHaveProperty('avgStreakDays');
      expect(body).toHaveProperty('weeklySchedule');
      expect(body).toHaveProperty('sessionsTrend');
      expect(Array.isArray(body.weeklySchedule)).toBe(true);
      expect((body.weeklySchedule as unknown[]).length).toBe(7);
      expect(Array.isArray(body.sessionsTrend)).toBe(true);
      expect((body.sessionsTrend as unknown[]).length).toBe(6);
    });

    it('as a member (forbidden role) → 403', async () => {
      await request(app.getHttpServer())
        .get(`/trainers/${trainer1Id}/overview-stats`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });
});

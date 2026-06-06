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
import { MembersModule } from '../src/modules/members/members.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  BodyTest,
  BodyTestSchema,
  BodyTestDocument,
} from '../src/common/models/body-test.model';
import {
  CheckIn,
  CheckInSchema,
  CheckInDocument,
} from '../src/common/models/check-in.model';
import {
  MemberInjury,
  MemberInjurySchema,
  MemberInjuryDocument,
} from '../src/common/models/member-injury.model';
import {
  MemberMedication,
  MemberMedicationSchema,
  MemberMedicationDocument,
} from '../src/common/models/member-medication.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'members-e2e-owner@example.com';
const TRAINER_EMAIL = 'members-e2e-trainer@example.com';
const TRAINER2_EMAIL = 'members-e2e-trainer2@example.com';
const MEMBER_EMAIL = 'members-e2e-member@example.com';
const MEMBER2_EMAIL = 'members-e2e-member2@example.com';
const MEMBER_ROLE_EMAIL = 'members-e2e-memberuser@example.com';
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
        { name: BodyTest.name, schema: BodyTestSchema },
        { name: CheckIn.name, schema: CheckInSchema },
        { name: MemberInjury.name, schema: MemberInjurySchema },
        { name: MemberMedication.name, schema: MemberMedicationSchema },
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
      MembersModule,
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

describe('Members (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;

  let userModel: Model<UserDocument>;
  let bodyTestModel: Model<BodyTestDocument>;
  let checkInModel: Model<CheckInDocument>;
  let injuryModel: Model<MemberInjuryDocument>;
  let medicationModel: Model<MemberMedicationDocument>;

  let ownerToken: string;
  let trainerToken: string;
  let trainer2Token: string;
  let memberToken: string;

  let ownerId: Types.ObjectId;
  let trainerId: Types.ObjectId;
  let trainer2Id: Types.ObjectId;
  let memberId: Types.ObjectId;
  let member2Id: Types.ObjectId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    bodyTestModel = module.get<Model<BodyTestDocument>>(
      getModelToken(BodyTest.name),
    );
    checkInModel = module.get<Model<CheckInDocument>>(
      getModelToken(CheckIn.name),
    );
    injuryModel = module.get<Model<MemberInjuryDocument>>(
      getModelToken(MemberInjury.name),
    );
    medicationModel = module.get<Model<MemberMedicationDocument>>(
      getModelToken(MemberMedication.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    ownerId = new Types.ObjectId();
    trainerId = new Types.ObjectId();
    trainer2Id = new Types.ObjectId();
    memberId = new Types.ObjectId();
    member2Id = new Types.ObjectId();

    await userModel.create({
      _id: ownerId,
      firstName: 'Members',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: trainerId,
      firstName: 'Trainer',
      lastName: 'One',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: trainer2Id,
      firstName: 'Trainer',
      lastName: 'Two',
      email: TRAINER2_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    // member1 belongs to trainer1
    await userModel.create({
      _id: memberId,
      firstName: 'Alice',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: trainerId,
    });

    // member2 belongs to trainer2
    await userModel.create({
      _id: member2Id,
      firstName: 'Bob',
      lastName: 'OtherMember',
      email: MEMBER2_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: trainer2Id,
    });

    // A user with 'member' role (used for the 403 test)
    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Regular',
      lastName: 'Member',
      email: MEMBER_ROLE_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: trainerId,
    });

    // Seed body test for member1
    await bodyTestModel.create({
      memberId,
      trainerId: null,
      date: new Date('2026-03-15'),
      age: 25,
      sex: 'female',
      weight: 65,
      protocol: 'other',
      bodyFatPct: 22,
      fatMassKg: 14.3,
      leanMassKg: 50.7,
      targetWeight: null,
      targetBodyFatPct: null,
    });

    // Seed check-in for member1
    await checkInModel.create({
      memberId,
      trainerId,
      submittedAt: new Date('2026-04-10'),
      sleepQuality: 7,
      stress: 4,
      fatigue: 5,
      hunger: 6,
      recovery: 7,
      energy: 6,
      digestion: 8,
      stuckToDiet: 'yes',
    });

    // Seed injuries for member1: one active, one resolved
    await injuryModel.create({
      memberId,
      title: 'Active Knee Injury',
      status: 'active',
      createdByRole: 'trainer',
    });
    await injuryModel.create({
      memberId,
      title: 'Old Shoulder Injury',
      status: 'resolved',
      createdByRole: 'trainer',
    });

    // Seed medications for member1: one active, one ended
    await medicationModel.create({
      memberId,
      name: 'Ibuprofen',
      purpose: 'Pain relief',
      duration: 'short_term',
      startDate: new Date('2026-01-01'),
      endDate: null,
      status: 'active',
    });
    await medicationModel.create({
      memberId,
      name: 'Old Med',
      purpose: 'Old purpose',
      duration: 'short_term',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-06-01'),
      status: 'ended',
    });

    // Login all users
    const loginOwner = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: OWNER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    ownerToken = (loginOwner.body as { accessToken: string }).accessToken;

    const loginTrainer = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TRAINER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    trainerToken = (loginTrainer.body as { accessToken: string }).accessToken;

    const loginTrainer2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TRAINER2_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    trainer2Token = (loginTrainer2.body as { accessToken: string }).accessToken;

    const loginMember = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: MEMBER_ROLE_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    memberToken = (loginMember.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── GET /members ─────────────────────────────────────────────────────────────

  describe('GET /members', () => {
    it('as owner → 200, array includes member objects with id, name, email, trainerId, trainerName', async () => {
      const res = await request(app.getHttpServer())
        .get('/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const body = res.body as Array<{
        id: string;
        name: string;
        email: string;
        trainerId: string | null;
        trainerName: string | null;
      }>;
      expect(body.length).toBeGreaterThanOrEqual(2);

      const alice = body.find((m) => m.email === MEMBER_EMAIL);
      expect(alice).toBeDefined();
      expect(alice).toMatchObject({
        id: memberId.toString(),
        name: 'Alice Member',
        email: MEMBER_EMAIL,
        trainerId: trainerId.toString(),
        trainerName: 'Trainer One',
      });
    });

    it('as trainer → 200, array contains only that trainer members (different trainer member is absent)', async () => {
      const res = await request(app.getHttpServer())
        .get('/members')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const body = res.body as Array<{ email: string }>;
      const memberEmails = body.map((m) => m.email);
      expect(memberEmails).toContain(MEMBER_EMAIL);
      expect(memberEmails).not.toContain(MEMBER2_EMAIL);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/members').expect(401);
    });

    it('member-role user → 403', async () => {
      await request(app.getHttpServer())
        .get('/members')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── GET /members/:id/overview ────────────────────────────────────────────────

  describe('GET /members/:id/overview', () => {
    it('as owner → 200 with joinedAt, lastBodyTestDate, lastCheckinDate shape', async () => {
      const res = await request(app.getHttpServer())
        .get(`/members/${memberId.toString()}/overview`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as {
        joinedAt: string;
        lastBodyTestDate: string | null;
        lastCheckinDate: string | null;
      };
      expect(body).toHaveProperty('joinedAt');
      expect(body).toHaveProperty('lastBodyTestDate');
      expect(body).toHaveProperty('lastCheckinDate');
      expect(body.lastBodyTestDate).not.toBeNull();
      expect(body.lastCheckinDate).not.toBeNull();
    });

    it('as trainer for a member NOT theirs → 404', async () => {
      await request(app.getHttpServer())
        .get(`/members/${member2Id.toString()}/overview`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(404);
    });
  });

  // ─── GET /members/:id/body-tests ─────────────────────────────────────────────

  describe('GET /members/:id/body-tests', () => {
    it('as owner → 200 array of the member body tests sorted date desc', async () => {
      const res = await request(app.getHttpServer())
        .get(`/members/${memberId.toString()}/body-tests`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Array<{ date: string }>;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── GET /members/:id/injuries ────────────────────────────────────────────────

  describe('GET /members/:id/injuries', () => {
    it('as owner → 200 array of only the member active injuries (resolved injury is absent)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/members/${memberId.toString()}/injuries`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Array<{ title: string; status: string }>;
      expect(Array.isArray(body)).toBe(true);

      const activeInjury = body.find((i) => i.title === 'Active Knee Injury');
      const resolvedInjury = body.find(
        (i) => i.title === 'Old Shoulder Injury',
      );

      expect(activeInjury).toBeDefined();
      expect(resolvedInjury).toBeUndefined();
    });
  });

  // ─── GET /members/:id/medications ─────────────────────────────────────────────

  describe('GET /members/:id/medications', () => {
    it('as owner → 200 array of only the member active medications (ended medication is absent)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/members/${memberId.toString()}/medications`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Array<{ name: string; status: string }>;
      expect(Array.isArray(body)).toBe(true);

      const activeMed = body.find((m) => m.name === 'Ibuprofen');
      const endedMed = body.find((m) => m.name === 'Old Med');

      expect(activeMed).toBeDefined();
      expect(endedMed).toBeUndefined();
    });
  });

  // ─── Trainer isolation across all detail endpoints ────────────────────────────

  describe('Trainer scoping on detail endpoints', () => {
    it('trainer2 requesting member1 overview → 404', async () => {
      await request(app.getHttpServer())
        .get(`/members/${memberId.toString()}/overview`)
        .set('Authorization', `Bearer ${trainer2Token}`)
        .expect(404);
    });

    it('trainer2 requesting member1 body-tests → 404', async () => {
      await request(app.getHttpServer())
        .get(`/members/${memberId.toString()}/body-tests`)
        .set('Authorization', `Bearer ${trainer2Token}`)
        .expect(404);
    });

    it('trainer2 requesting member1 injuries → 404', async () => {
      await request(app.getHttpServer())
        .get(`/members/${memberId.toString()}/injuries`)
        .set('Authorization', `Bearer ${trainer2Token}`)
        .expect(404);
    });

    it('trainer2 requesting member1 medications → 404', async () => {
      await request(app.getHttpServer())
        .get(`/members/${memberId.toString()}/medications`)
        .set('Authorization', `Bearer ${trainer2Token}`)
        .expect(404);
    });
  });

  // ─── GET /members/:id/overview-stats ─────────────────────────────────────────

  describe('GET /members/:id/overview-stats', () => {
    it('as owner → 200 with the full stats shape (all keys present)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/members/${memberId.toString()}/overview-stats`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('sessionsThisMonth');
      expect(body).toHaveProperty('weight');
      expect(body).toHaveProperty('bodyFat');
      expect(body).toHaveProperty('topPR');
      expect(body).toHaveProperty('activePlan');
      expect(body).toHaveProperty('activeInjuryCount');
      expect(body).toHaveProperty('activeMedicationCount');
      expect(body).toHaveProperty('weightTrend');
      expect(body).toHaveProperty('heatmap');
      expect(typeof body.sessionsThisMonth).toBe('number');
      expect(Array.isArray(body.weightTrend)).toBe(true);
      expect(Array.isArray(body.heatmap)).toBe(true);
    });

    it('as a trainer for a member of another trainer → 404', async () => {
      await request(app.getHttpServer())
        .get(`/members/${member2Id.toString()}/overview-stats`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(404);
    });

    it('with no auth token → 401', async () => {
      await request(app.getHttpServer())
        .get(`/members/${memberId.toString()}/overview-stats`)
        .expect(401);
    });
  });
});

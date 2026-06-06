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
import { EquipmentModule } from '../src/modules/equipment/equipment.module';
import { CheckInsModule } from '../src/modules/check-ins/check-ins.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  CheckIn,
  CheckInSchema,
  CheckInDocument,
} from '../src/common/models/check-in.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const TEST_PASSWORD = 'Password1';

const validCheckInBody = {
  sleepQuality: 7,
  stress: 5,
  fatigue: 4,
  hunger: 6,
  recovery: 8,
  energy: 7,
  digestion: 6,
  stuckToDiet: 'yes',
};

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
        { name: CheckIn.name, schema: CheckInSchema },
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
      EquipmentModule,
      CheckInsModule,
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

describe('CheckIns member-scoped endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let checkInModel: Model<CheckInDocument>;

  let ownerToken: string;
  let trainerToken: string;
  let otherTrainerToken: string;
  let memberToken: string;
  let memberId: string;
  let checkInId: string;
  let otherCheckInId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    checkInModel = module.get<Model<CheckInDocument>>(
      getModelToken(CheckIn.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    // Owner
    const ownerObjId = new Types.ObjectId();
    await userModel.create({
      _id: ownerObjId,
      firstName: 'CI',
      lastName: 'Owner',
      email: 'ci-members-owner@example.com',
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    // Trainer (assigned to the member)
    const trainerObjId = new Types.ObjectId();
    await userModel.create({
      _id: trainerObjId,
      firstName: 'CI',
      lastName: 'Trainer',
      email: 'ci-members-trainer@example.com',
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    // Other trainer (not assigned to the member)
    const otherTrainerObjId = new Types.ObjectId();
    await userModel.create({
      _id: otherTrainerObjId,
      firstName: 'CI',
      lastName: 'OtherTrainer',
      email: 'ci-members-other-trainer@example.com',
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    // Member assigned to trainerObjId
    const memberObjId = new Types.ObjectId();
    memberId = memberObjId.toString();
    await userModel.create({
      _id: memberObjId,
      firstName: 'CI',
      lastName: 'Member',
      email: 'ci-members-member@example.com',
      passwordHash,
      role: 'member',
      trainerId: trainerObjId,
    });

    // Other member assigned to other trainer
    const otherMemberObjId = new Types.ObjectId();
    await userModel.create({
      _id: otherMemberObjId,
      firstName: 'CI',
      lastName: 'OtherMember',
      email: 'ci-members-other-member@example.com',
      passwordHash,
      role: 'member',
      trainerId: otherTrainerObjId,
    });

    // Seed a check-in for the member
    const checkIn = await checkInModel.create({
      ...validCheckInBody,
      memberId: memberObjId,
      trainerId: trainerObjId,
      submittedAt: new Date(),
    });
    checkInId = (checkIn._id as Types.ObjectId).toString();

    // Seed a check-in for the other member
    const otherCheckIn = await checkInModel.create({
      ...validCheckInBody,
      memberId: otherMemberObjId,
      trainerId: otherTrainerObjId,
      submittedAt: new Date(),
    });
    otherCheckInId = (otherCheckIn._id as Types.ObjectId).toString();

    // Obtain tokens
    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ci-members-owner@example.com', password: TEST_PASSWORD })
      .expect(201);
    ownerToken = (ownerLogin.body as { accessToken: string }).accessToken;

    const trainerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ci-members-trainer@example.com',
        password: TEST_PASSWORD,
      })
      .expect(201);
    trainerToken = (trainerLogin.body as { accessToken: string }).accessToken;

    const otherTrainerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ci-members-other-trainer@example.com',
        password: TEST_PASSWORD,
      })
      .expect(201);
    otherTrainerToken = (otherTrainerLogin.body as { accessToken: string })
      .accessToken;

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ci-members-member@example.com', password: TEST_PASSWORD })
      .expect(201);
    memberToken = (memberLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── GET /check-ins/members/:memberId ────────────────────────────────────────

  describe('GET /check-ins/members/:memberId', () => {
    it('owner → 200, array with sleepQuality, energy, stress, submittedAt', async () => {
      const res = await request(app.getHttpServer())
        .get(`/check-ins/members/${memberId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0]).toHaveProperty('sleepQuality');
      expect(body[0]).toHaveProperty('energy');
      expect(body[0]).toHaveProperty('stress');
      expect(body[0]).toHaveProperty('submittedAt');
    });

    it("member's own trainer → 200 with the member's check-ins", async () => {
      const res = await request(app.getHttpServer())
        .get(`/check-ins/members/${memberId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it('different trainer (member not theirs) → 404', async () => {
      await request(app.getHttpServer())
        .get(`/check-ins/members/${memberId}`)
        .set('Authorization', `Bearer ${otherTrainerToken}`)
        .expect(404);
    });

    it('member-role token → 403', async () => {
      await request(app.getHttpServer())
        .get(`/check-ins/members/${memberId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .get(`/check-ins/members/${memberId}`)
        .expect(401);
    });
  });

  // ─── GET /check-ins/members/:memberId/:id ────────────────────────────────────

  describe('GET /check-ins/members/:memberId/:id', () => {
    it('owner with valid id → 200 with matching check-in _id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/check-ins/members/${memberId}/${checkInId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body._id).toBe(checkInId);
    });

    it('owner with id belonging to a different member → 404', async () => {
      await request(app.getHttpServer())
        .get(`/check-ins/members/${memberId}/${otherCheckInId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  // ─── Regression: existing GET /check-ins ─────────────────────────────────────

  describe('Regression: GET /check-ins', () => {
    it('member token still returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/check-ins')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

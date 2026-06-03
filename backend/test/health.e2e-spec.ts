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
import { HealthModule } from '../src/modules/health/health.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  MemberInjury,
  MemberInjurySchema,
  MemberInjuryDocument,
} from '../src/common/models/member-injury.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'health-e2e-owner@example.com';
const TRAINER_EMAIL = 'health-e2e-trainer@example.com';
const MEMBER_EMAIL = 'health-e2e-member@example.com';
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
        { name: MemberInjury.name, schema: MemberInjurySchema },
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
      HealthModule,
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

describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let injuryModel: Model<MemberInjuryDocument>;
  let memberToken: string;
  let trainerToken: string;
  let memberId: Types.ObjectId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    injuryModel = module.get<Model<MemberInjuryDocument>>(
      getModelToken(MemberInjury.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const ownerObjId = new Types.ObjectId();
    const trainerObjId = new Types.ObjectId();
    memberId = new Types.ObjectId();

    await userModel.create({
      _id: ownerObjId,
      firstName: 'Health',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: trainerObjId,
      firstName: 'Health',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: memberId,
      firstName: 'Health',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: trainerObjId,
    });

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

  // ─── POST /health/injuries ─────────────────────────────────────────────────

  describe('POST /health/injuries', () => {
    it('valid member JWT + { title } → 201 with _id, status: active, createdByRole: member', async () => {
      const res = await request(app.getHttpServer())
        .post('/health/injuries')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Left knee strain' })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body.status).toBe('active');
      expect(body.createdByRole).toBe('member');
    });

    it('no Authorization header → 401', async () => {
      await request(app.getHttpServer()).get('/health/injuries').expect(401);
    });

    it('trainer JWT → 403', async () => {
      await request(app.getHttpServer())
        .get('/health/injuries')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(403);
    });

    it('missing title → 400', async () => {
      await request(app.getHttpServer())
        .post('/health/injuries')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({})
        .expect(400);
    });
  });

  // ─── PATCH /health/injuries/:id ────────────────────────────────────────────

  describe('PATCH /health/injuries/:id', () => {
    it('id not owned by the caller → 404', async () => {
      const foreignId = new Types.ObjectId().toString();

      await request(app.getHttpServer())
        .patch(`/health/injuries/${foreignId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Changed' })
        .expect(404);
    });
  });

  // ─── DELETE /health/injuries/:id ───────────────────────────────────────────

  describe('DELETE /health/injuries/:id', () => {
    it('trainer-created injury → 403, record still present', async () => {
      // Seed a trainer-created injury for this member
      const injury = await injuryModel.create({
        memberId,
        title: 'Trainer-created injury',
        createdByRole: 'trainer',
        status: 'active',
      });
      const injuryId = injury._id.toString();

      await request(app.getHttpServer())
        .delete(`/health/injuries/${injuryId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      // Record still present
      const still = await injuryModel.findById(injuryId);
      expect(still).not.toBeNull();
    });
  });

  // ─── POST + PATCH /health/medications ──────────────────────────────────────

  describe('POST /health/medications then PATCH', () => {
    it('creates medication then marks as ended', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/health/medications')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Ibuprofen',
          purpose: 'Pain relief',
          duration: 'short_term',
          startDate: '2026-01-01',
        })
        .expect(201);

      const created = createRes.body as Record<string, unknown>;
      expect(created).toHaveProperty('_id');
      expect(created.status).toBe('active');

      const medicationId = created._id as string;

      const patchRes = await request(app.getHttpServer())
        .patch(`/health/medications/${medicationId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'ended' })
        .expect(200);

      const patched = patchRes.body as Record<string, unknown>;
      expect(patched.status).toBe('ended');
    });
  });

  // ─── GET + PUT /health/medical-background ──────────────────────────────────

  describe('GET /health/medical-background and PUT', () => {
    it('no record → 200 with chronicConditions: [] and null fields; PUT saves; GET returns saved', async () => {
      const getRes = await request(app.getHttpServer())
        .get('/health/medical-background')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const empty = getRes.body as Record<string, unknown>;
      expect(Array.isArray(empty.chronicConditions)).toBe(true);
      expect((empty.chronicConditions as string[]).length).toBe(0);
      expect(empty.allergies).toBeNull();

      await request(app.getHttpServer())
        .put('/health/medical-background')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ chronicConditions: ['Asthma'], allergies: 'Penicillin' })
        .expect(200);

      const getRes2 = await request(app.getHttpServer())
        .get('/health/medical-background')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const saved = getRes2.body as Record<string, unknown>;
      expect(saved.chronicConditions).toEqual(['Asthma']);
      expect(saved.allergies).toBe('Penicillin');
    });
  });
});

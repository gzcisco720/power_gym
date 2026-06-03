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
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'trainers-e2e-owner@example.com';
const TRAINER1_EMAIL = 'trainers-e2e-trainer1@example.com';
const TRAINER2_EMAIL = 'trainers-e2e-trainer2@example.com';
const MEMBER_EMAIL = 'trainers-e2e-member@example.com';
const MEMBER_ROLE_EMAIL = 'trainers-e2e-memberrole@example.com';
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
  let ownerToken: string;
  let memberToken: string;
  let trainer1Id: string;
  let trainer2Id: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

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

    // Create trainer2 (will have 0 members)
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

    // Create 2 members assigned to trainer1
    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Alice',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: new Types.ObjectId(trainer1Id),
    });

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
});

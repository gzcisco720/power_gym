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
import { CheckInsModule } from '../src/modules/check-ins/check-ins.module';
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

describe('CheckIn Schedule endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;

  let trainerToken: string;
  let otherTrainerToken: string;
  let memberToken: string;
  let memberId: string;
  let otherMemberId: string;

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: TEST_PASSWORD });
    return (res.body as { accessToken: string }).accessToken;
  }

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const trainerObjId = new Types.ObjectId();
    await userModel.create({
      _id: trainerObjId,
      firstName: 'Sched',
      lastName: 'Trainer',
      email: 'sched-trainer@example.com',
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    const otherTrainerObjId = new Types.ObjectId();
    await userModel.create({
      _id: otherTrainerObjId,
      firstName: 'Sched',
      lastName: 'Other',
      email: 'sched-other-trainer@example.com',
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    const memberObjId = new Types.ObjectId();
    memberId = memberObjId.toString();
    await userModel.create({
      _id: memberObjId,
      firstName: 'Sched',
      lastName: 'Member',
      email: 'sched-member@example.com',
      passwordHash,
      role: 'member',
      trainerId: trainerObjId,
    });

    const otherMemberObjId = new Types.ObjectId();
    otherMemberId = otherMemberObjId.toString();
    await userModel.create({
      _id: otherMemberObjId,
      firstName: 'Sched',
      lastName: 'OtherMember',
      email: 'sched-other-member@example.com',
      passwordHash,
      role: 'member',
      trainerId: otherTrainerObjId,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Sched',
      lastName: 'MemberUser',
      email: 'sched-member-user@example.com',
      passwordHash,
      role: 'member',
      trainerId: trainerObjId,
    });

    trainerToken = await login('sched-trainer@example.com');
    otherTrainerToken = await login('sched-other-trainer@example.com');
    memberToken = await login('sched-member-user@example.com');
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('PUT /check-ins/members/:memberId/schedule', () => {
    it('creates a config and GET returns it back (200)', async () => {
      const body = { dayOfWeek: 1, hour: 9, active: true };

      const putRes = await request(app.getHttpServer())
        .put(`/check-ins/members/${memberId}/schedule`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(body);

      expect(putRes.status).toBe(200);
      expect(putRes.body).toMatchObject({
        dayOfWeek: 1,
        hour: 9,
        minute: 0,
        active: true,
      });

      const getRes = await request(app.getHttpServer())
        .get(`/check-ins/members/${memberId}/schedule`)
        .set('Authorization', `Bearer ${trainerToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body).toMatchObject({ dayOfWeek: 1, hour: 9, active: true });
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app.getHttpServer())
        .put(`/check-ins/members/${memberId}/schedule`)
        .send({ dayOfWeek: 1, hour: 9, active: true });

      expect(res.status).toBe(401);
    });

    it('returns 400 when body is invalid (dayOfWeek out of range)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/check-ins/members/${memberId}/schedule`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ dayOfWeek: 9, hour: 9, active: true });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /check-ins/members/:memberId/schedule', () => {
    it('returns 404 when trainer does not own the member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/check-ins/members/${otherMemberId}/schedule`)
        .set('Authorization', `Bearer ${trainerToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app.getHttpServer())
        .get(`/check-ins/members/${memberId}/schedule`);

      expect(res.status).toBe(401);
    });

    it('returns 403 when a member role requests', async () => {
      const res = await request(app.getHttpServer())
        .get(`/check-ins/members/${memberId}/schedule`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });
});

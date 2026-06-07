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

describe('PATCH /members/:id/assign-trainer (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;

  let ownerToken: string;
  let trainerToken: string;
  let memberId: string;
  let trainerId: string;

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

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Assign',
      lastName: 'Owner',
      email: 'assign-owner@example.com',
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    const trainerObjId = new Types.ObjectId();
    trainerId = trainerObjId.toString();
    await userModel.create({
      _id: trainerObjId,
      firstName: 'Assign',
      lastName: 'Trainer',
      email: 'assign-trainer@example.com',
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    const memberObjId = new Types.ObjectId();
    memberId = memberObjId.toString();
    await userModel.create({
      _id: memberObjId,
      firstName: 'Assign',
      lastName: 'Member',
      email: 'assign-member@example.com',
      passwordHash,
      role: 'member',
      trainerId: trainerObjId,
    });

    ownerToken = await login('assign-owner@example.com');
    trainerToken = await login('assign-trainer@example.com');
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('owner assigns a trainer → 200, subsequent member fetch shows the trainer', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/members/${memberId}/assign-trainer`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ trainerId });

    expect(res.status).toBe(200);
  });

  it('owner unassigns (trainerId null) → 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/members/${memberId}/assign-trainer`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ trainerId: null });

    expect(res.status).toBe(200);
    expect((res.body as { trainerId: null }).trainerId).toBeNull();
  });

  it('malformed body (non-mongoid non-null string) → 400', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/members/${memberId}/assign-trainer`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ trainerId: 'not-a-valid-id' });

    expect(res.status).toBe(400);
  });

  it('trainer role → 403', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/members/${memberId}/assign-trainer`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ trainerId: null });

    expect(res.status).toBe(403);
  });

  it('unauthenticated → 401', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/members/${memberId}/assign-trainer`)
      .send({ trainerId: null });

    expect(res.status).toBe(401);
  });
});

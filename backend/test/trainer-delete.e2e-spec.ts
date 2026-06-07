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

describe('DELETE /trainers/:id (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;

  let ownerToken: string;
  let trainerToken: string;
  let deletableTrainerId: string;

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
      firstName: 'Del',
      lastName: 'Owner',
      email: 'del-owner@example.com',
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    // Trainer to be used as the requesting trainer (not deleted)
    const trainerObjId = new Types.ObjectId();
    await userModel.create({
      _id: trainerObjId,
      firstName: 'Del',
      lastName: 'Trainer',
      email: 'del-trainer@example.com',
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    // Trainer to be deleted (with 2 members)
    const deletableTrainerObjId = new Types.ObjectId();
    deletableTrainerId = deletableTrainerObjId.toString();
    await userModel.create({
      _id: deletableTrainerObjId,
      firstName: 'Del',
      lastName: 'ToDelete',
      email: 'del-to-delete@example.com',
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    // Two members under the deletable trainer
    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Del',
      lastName: 'Member1',
      email: 'del-member1@example.com',
      passwordHash,
      role: 'member',
      trainerId: deletableTrainerObjId,
    });
    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Del',
      lastName: 'Member2',
      email: 'del-member2@example.com',
      passwordHash,
      role: 'member',
      trainerId: deletableTrainerObjId,
    });

    ownerToken = await login('del-owner@example.com');
    trainerToken = await login('del-trainer@example.com');
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('owner deletes a trainer → 200 with affectedMemberCount', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/trainers/${deletableTrainerId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ affectedMemberCount: 2 });
  });

  it('trainer role → 403', async () => {
    const nonexistentId = new Types.ObjectId().toString();
    const res = await request(app.getHttpServer())
      .delete(`/trainers/${nonexistentId}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(403);
  });

  it('unauthenticated → 401', async () => {
    const nonexistentId = new Types.ObjectId().toString();
    const res = await request(app.getHttpServer())
      .delete(`/trainers/${nonexistentId}`);

    expect(res.status).toBe(401);
  });

  it('nonexistent trainer id → 404', async () => {
    const nonexistentId = new Types.ObjectId().toString();
    const res = await request(app.getHttpServer())
      .delete(`/trainers/${nonexistentId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
  });
});

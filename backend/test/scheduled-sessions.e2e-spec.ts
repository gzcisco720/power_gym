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
import { ScheduledSessionsModule } from '../src/modules/scheduled-sessions/scheduled-sessions.module';
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

const OWNER_EMAIL = 'ss-e2e-owner@example.com';
const MEMBER_EMAIL = 'ss-e2e-member@example.com';
const MEMBER2_EMAIL = 'ss-e2e-member2@example.com';
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
      EquipmentModule,
      CheckInsModule,
      ScheduledSessionsModule,
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

describe('ScheduledSessions (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let ownerToken: string;
  let memberToken: string;
  let member2Token: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const ownerObjId = new Types.ObjectId();

    await userModel.create({
      _id: ownerObjId,
      firstName: 'SS',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      firstName: 'SS',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: ownerObjId,
    });

    await userModel.create({
      firstName: 'SS',
      lastName: 'Member2',
      email: MEMBER2_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: ownerObjId,
    });

    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: OWNER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    ownerToken = (ownerLogin.body as { accessToken: string }).accessToken;

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: MEMBER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    memberToken = (memberLogin.body as { accessToken: string }).accessToken;

    const member2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: MEMBER2_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    member2Token = (member2Login.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── GET /scheduled-sessions/my ──────────────────────────────────────────────

  describe('GET /scheduled-sessions/my', () => {
    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .get('/scheduled-sessions/my')
        .expect(401);
    });

    it('owner token → 403', async () => {
      await request(app.getHttpServer())
        .get('/scheduled-sessions/my')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('member token → 200 with empty array (no sessions yet)', async () => {
      const res = await request(app.getHttpServer())
        .get('/scheduled-sessions/my')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('after seeding two sessions the array has >= 2 items, sorted date asc, with required keys', async () => {
      // Seed sessions for the member via the dev endpoint
      await request(app.getHttpServer())
        .post('/scheduled-sessions/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          sessions: [
            {
              date: '2026-09-01T09:00:00.000Z',
              startTime: '09:00',
              endTime: '10:00',
              serviceTypeName: 'Strength Training',
            },
            {
              date: '2026-08-01T09:00:00.000Z',
              startTime: '08:00',
              endTime: '09:00',
            },
          ],
        })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/scheduled-sessions/my')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const items = res.body as Array<Record<string, unknown>>;
      expect(items.length).toBeGreaterThanOrEqual(2);

      // Sorted ascending by date
      for (let i = 1; i < items.length; i++) {
        const prev = new Date(items[i - 1].date as string).getTime();
        const curr = new Date(items[i].date as string).getTime();
        expect(prev).toBeLessThanOrEqual(curr);
      }

      // Each item has required keys
      for (const item of items) {
        expect(item).toHaveProperty('_id');
        expect(item).toHaveProperty('trainerName');
        expect(item).toHaveProperty('isRecurring');
        expect(
          Object.prototype.hasOwnProperty.call(item, 'serviceTypeName'),
        ).toBe(true);
      }
    });

    it('member2 does NOT receive member1 sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/scheduled-sessions/my')
        .set('Authorization', `Bearer ${member2Token}`)
        .expect(200);

      const items = res.body as Array<Record<string, unknown>>;
      // Member2 has no seeded sessions
      expect(items.length).toBe(0);
    });
  });
});

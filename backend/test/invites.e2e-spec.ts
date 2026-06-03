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
import { EmailModule } from '../src/common/email/email.module';
import { InvitesModule } from '../src/modules/invites/invites.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'inv-e2e-owner@example.com';
const OWNER2_EMAIL = 'inv-e2e-owner2@example.com';
const TRAINER_EMAIL = 'inv-e2e-trainer@example.com';
const MEMBER_EMAIL = 'inv-e2e-member@example.com';
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
      InvitesModule,
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

describe('Invites (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let ownerToken: string;
  let owner2Token: string;
  let trainerToken: string;
  let memberToken: string;
  let trainerId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Inv',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Inv',
      lastName: 'Owner2',
      email: OWNER2_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    const trainerUser = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Inv',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });
    trainerId = trainerUser._id.toString();

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Inv',
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

    const owner2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: OWNER2_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    owner2Token = (owner2Login.body as { accessToken: string }).accessToken;

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

  // ─── POST /invites ────────────────────────────────────────────────────────────

  describe('POST /invites', () => {
    it('owner with {role:"trainer", recipientEmail:"t@x.com"} → 201 with _id, token (non-empty), usedAt:null, invitedBy present', async () => {
      const res = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'trainer', recipientEmail: 't@x.com' })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(typeof body.token).toBe('string');
      expect((body.token as string).length).toBeGreaterThan(0);
      expect(body.usedAt).toBeNull();
      expect(body).toHaveProperty('invitedBy');
    });

    it('owner with {role:"member", recipientEmail:"m@x.com"} (no trainerId) → 400', async () => {
      await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'member', recipientEmail: 'm@x.com' })
        .expect(400);
    });

    it('owner with {role:"member", recipientEmail:"m@x.com", trainerId} → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'member', recipientEmail: 'm@x.com', trainerId })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body.role).toBe('member');
    });

    it('trainer with {role:"trainer", recipientEmail:"t@x.com"} → 403', async () => {
      await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ role: 'trainer', recipientEmail: 't@x.com' })
        .expect(403);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'member', recipientEmail: 'm@x.com' })
        .expect(403);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .post('/invites')
        .send({ role: 'trainer', recipientEmail: 't@x.com' })
        .expect(401);
    });
  });

  // ─── GET /invites ─────────────────────────────────────────────────────────────

  describe('GET /invites', () => {
    it('owner → 200 array containing only invites created by that owner, sorted by expiresAt descending', async () => {
      // Create two invites for owner1, one for owner2
      await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'trainer', recipientEmail: 'a@x.com' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'trainer', recipientEmail: 'b@x.com' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({ role: 'trainer', recipientEmail: 'c@x.com' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const items = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(items)).toBe(true);
      // All returned invites belong to owner1 (not owner2's c@x.com invite)
      expect(items.every((i) => typeof i.invitedBy === 'string')).toBe(true);
      // Verify emails from owner2 are not included
      const emails = items.map((i) => i.recipientEmail as string);
      expect(emails).not.toContain('c@x.com');

      // Verify sorted by expiresAt descending
      const dates = items.map((i) => new Date(i.expiresAt as string).getTime());
      const sorted = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sorted);
    });
  });

  // ─── GET /invites/trainers ────────────────────────────────────────────────────

  describe('GET /invites/trainers', () => {
    it('owner → 200 array of {_id, name}', async () => {
      const res = await request(app.getHttpServer())
        .get('/invites/trainers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const items = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      // Each entry has _id and name
      for (const item of items) {
        expect(item).toHaveProperty('_id');
        expect(item).toHaveProperty('name');
      }
    });

    it('trainer → 403', async () => {
      await request(app.getHttpServer())
        .get('/invites/trainers')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(403);
    });
  });

  // ─── DELETE /invites/:id ──────────────────────────────────────────────────────

  describe('DELETE /invites/:id', () => {
    it('creating owner on an unused invite → 200, and a subsequent GET no longer includes it', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'trainer', recipientEmail: 'delete-me@x.com' })
        .expect(201);

      const id = (createRes.body as Record<string, unknown>)._id as string;

      await request(app.getHttpServer())
        .delete(`/invites/${id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const listRes = await request(app.getHttpServer())
        .get('/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const items = listRes.body as Array<Record<string, unknown>>;
      expect(items.every((i) => i._id !== id)).toBe(true);
    });

    it('id belonging to another user → 404', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'trainer', recipientEmail: 'other-owner@x.com' })
        .expect(201);

      const id = (createRes.body as Record<string, unknown>)._id as string;

      // owner2 tries to delete owner1's invite → 404
      await request(app.getHttpServer())
        .delete(`/invites/${id}`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .expect(404);
    });
  });
});

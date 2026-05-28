import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { ThrottlerStorage } from '@nestjs/throttler';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { InviteRepository } from './../src/repositories/invite.repository';

interface ClearableStorage {
  storage?: Map<string, unknown>;
}

interface LoginBody {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; role: string };
}

const OWNER = {
  firstName: 'Olivia',
  lastName: 'Owner',
  email: 'owner-users@example.com',
  password: 'OwnerPass123!',
};

const TRAINER = {
  firstName: 'Trevor',
  lastName: 'Trainer',
  email: 'trainer-users@example.com',
  password: 'TrainerPass123!',
};

const MEMBER = {
  firstName: 'Mike',
  lastName: 'Member',
  email: 'member-users@example.com',
  password: 'MemberPass123!',
};

describe('Users & Account (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let connection: Connection;
  let inviteRepo: InviteRepository;
  let throttlerStorage: ClearableStorage;

  let ownerToken: string;
  let ownerId: string;
  let trainerToken: string;
  let trainerId: string;
  let memberToken: string;
  let memberId: string;

  async function clearCollections(): Promise<void> {
    const db = connection.db;
    if (!db) return;
    const names = [
      'users',
      'invitetokens',
      'passwordresettokens',
      'refreshtokens',
      'userprofiles',
    ];
    await Promise.all(
      names.map((n) =>
        db
          .collection(n)
          .deleteMany({})
          .catch(() => undefined),
      ),
    );
  }

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new HttpExceptionFilter(httpAdapter));
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    inviteRepo = moduleFixture.get(InviteRepository);
    throttlerStorage = moduleFixture.get<ClearableStorage>(ThrottlerStorage);

    await clearCollections();
    throttlerStorage.storage?.clear();

    // 1. Register owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(OWNER);
    expect(ownerRes.status).toBe(201);
    const ownerBody = ownerRes.body as LoginBody;
    ownerToken = ownerBody.access_token;
    ownerId = ownerBody.user.id;

    // 2. Create trainer invite and register trainer
    const trainerInvite = await inviteRepo.create({
      token: 'trainer-invite-token',
      role: 'trainer',
      invitedBy: ownerId,
      recipientEmail: TRAINER.email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const trainerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...TRAINER, token: trainerInvite.token });
    expect(trainerRes.status).toBe(201);
    const trainerBody = trainerRes.body as LoginBody;
    trainerToken = trainerBody.access_token;
    trainerId = trainerBody.user.id;

    // 3. Create member invite and register member
    const memberInvite = await inviteRepo.create({
      token: 'member-invite-token',
      role: 'member',
      invitedBy: ownerId,
      recipientEmail: MEMBER.email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      trainerId: trainerId,
    });
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...MEMBER, token: memberInvite.token });
    expect(memberRes.status).toBe(201);
    const memberBody = memberRes.body as LoginBody;
    memberToken = memberBody.access_token;
    memberId = memberBody.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ──────────────────────────────────────────────────────────
  // Sprint Contract assertions
  // ──────────────────────────────────────────────────────────

  describe('GET /api/v1/members (Sprint Contract)', () => {
    it('as owner → 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/members')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('as member → 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/members')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });

    it('as trainer → 200 + array (own members only)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/members')
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/members/:id (Sprint Contract)', () => {
    it('trainer requests own member → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
    });

    it('trainer requests a foreign member id → 404', async () => {
      // Create a second trainer and a member that belongs to them
      const trainer2Invite = await inviteRepo.create({
        token: 'trainer2-invite',
        role: 'trainer',
        invitedBy: ownerId,
        recipientEmail: 'trainer2@example.com',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      const t2Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'T2',
          lastName: 'Trainer',
          email: 'trainer2@example.com',
          password: 'Trainer2Pass123!',
          token: trainer2Invite.token,
        });
      expect(t2Res.status).toBe(201);
      const trainer2Token = (t2Res.body as LoginBody).access_token;
      const trainer2Id = (t2Res.body as LoginBody).user.id;

      const m2Invite = await inviteRepo.create({
        token: 'member2-invite',
        role: 'member',
        invitedBy: ownerId,
        recipientEmail: 'member2@example.com',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        trainerId: trainer2Id,
      });
      const m2Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'M2',
          lastName: 'Member',
          email: 'member2@example.com',
          password: 'Member2Pass123!',
          token: m2Invite.token,
        });
      expect(m2Res.status).toBe(201);
      const member2Id = (m2Res.body as LoginBody).user.id;

      // trainer1 tries to access trainer2's member → 404
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${member2Id}`)
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(404);

      // trainer2 can access their own member → 200
      const res2 = await request(app.getHttpServer())
        .get(`/api/v1/members/${member2Id}`)
        .set('Authorization', `Bearer ${trainer2Token}`);
      expect(res2.status).toBe(200);
    });
  });

  describe('POST /api/v1/invites (Sprint Contract)', () => {
    it('owner with valid body → 201 + body.token defined', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role: 'member',
          recipientEmail: 'newinvitee@example.com',
        });
      expect(res.status).toBe(201);
      expect((res.body as { token: string }).token).toBeDefined();
    });

    it('trainer inviting a member → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          role: 'member',
          recipientEmail: 'trainerinvitee@example.com',
        });
      expect(res.status).toBe(201);
      expect((res.body as { token: string }).token).toBeDefined();
    });

    it('member trying to invite → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          role: 'member',
          recipientEmail: 'cant@example.com',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/owner/members/:id/trainer (Sprint Contract)', () => {
    it('as owner → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/owner/members/${memberId}/trainer`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ trainerId: null });
      expect(res.status).toBe(200);
    });

    it('as trainer → 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/owner/members/${memberId}/trainer`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ trainerId: null });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/account/password (Sprint Contract)', () => {
    it('correct current password → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/account/password')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          currentPassword: OWNER.password,
          newPassword: 'NewOwnerPass123!',
        });
      expect(res.status).toBe(200);
    });

    it('wrong current password → 400', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/account/password')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPass123!',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/account/email (Sprint Contract)', () => {
    it('to email already in use → 409', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/account/email')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ email: MEMBER.email });
      expect(res.status).toBe(409);
    });

    it('to new unique email → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/account/email')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ email: 'trainer-new-email@example.com' });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/owner/stats (Sprint Contract)', () => {
    it('as owner → 200 + body.membersByMonth defined', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/owner/stats')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(
        (res.body as { membersByMonth: unknown }).membersByMonth,
      ).toBeDefined();
    });

    it('as trainer → 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/owner/stats')
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Additional coverage
  // ──────────────────────────────────────────────────────────

  describe('GET /api/v1/owner/members', () => {
    it('as owner → 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/owner/members')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/owner/trainers', () => {
    it('as owner → 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/owner/trainers')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/profile', () => {
    it('authenticated user → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
    });

    it('PATCH /api/v1/profile → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/profile')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ bio: 'Test bio' });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/members/:id/profile', () => {
    it('owner accessing member profile → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/profile`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
    });

    it('member accessing their own profile → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/profile`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
    });
  });
});

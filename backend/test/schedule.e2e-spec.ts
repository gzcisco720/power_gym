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
  email: 'owner-schedule@example.com',
  password: 'OwnerPass123!',
};

const TRAINER = {
  firstName: 'Trevor',
  lastName: 'Trainer',
  email: 'trainer-schedule@example.com',
  password: 'TrainerPass123!',
};

const MEMBER = {
  firstName: 'Mike',
  lastName: 'Member',
  email: 'member-schedule@example.com',
  password: 'MemberPass123!',
};

const MEMBER2 = {
  firstName: 'Mary',
  lastName: 'Member2',
  email: 'member2-schedule@example.com',
  password: 'Member2Pass123!',
};

describe('Schedule & Check-ins (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let connection: Connection;
  let inviteRepo: InviteRepository;
  let throttlerStorage: ClearableStorage;

  let trainerToken: string;
  let trainerId: string;
  let memberToken: string;
  let memberId: string;
  let member2Token: string;

  let scheduledSessionId: string;

  async function clearCollections(): Promise<void> {
    const db = connection.db;
    if (!db) return;
    const names = [
      'users',
      'invitetokens',
      'passwordresettokens',
      'refreshtokens',
      'userprofiles',
      'scheduledsessions',
      'checkins',
      'checkinconfigs',
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
    const ownerId = (ownerRes.body as LoginBody).user.id;

    // 2. Register trainer
    const trainerInvite = await inviteRepo.create({
      token: 'schedule-trainer-invite',
      role: 'trainer',
      invitedBy: ownerId,
      recipientEmail: TRAINER.email,
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    const trainerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...TRAINER, token: trainerInvite.token });
    expect(trainerRes.status).toBe(201);
    trainerToken = (trainerRes.body as LoginBody).access_token;
    trainerId = (trainerRes.body as LoginBody).user.id;

    // 3. Register member (belongs to trainer)
    const memberInvite = await inviteRepo.create({
      token: 'schedule-member-invite',
      role: 'member',
      invitedBy: ownerId,
      recipientEmail: MEMBER.email,
      expiresAt: new Date(Date.now() + 3_600_000),
      trainerId,
    });
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...MEMBER, token: memberInvite.token });
    expect(memberRes.status).toBe(201);
    memberToken = (memberRes.body as LoginBody).access_token;
    memberId = (memberRes.body as LoginBody).user.id;

    // 4. Register member2 (also belongs to trainer)
    const member2Invite = await inviteRepo.create({
      token: 'schedule-member2-invite',
      role: 'member',
      invitedBy: ownerId,
      recipientEmail: MEMBER2.email,
      expiresAt: new Date(Date.now() + 3_600_000),
      trainerId,
    });
    const member2Res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...MEMBER2, token: member2Invite.token });
    expect(member2Res.status).toBe(201);
    member2Token = (member2Res.body as LoginBody).access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ──────────────────────────────────────────────────────────
  // Sprint Contract: Schedule
  // ──────────────────────────────────────────────────────────

  describe('POST /api/v1/schedule (Sprint Contract)', () => {
    it('as trainer → 201 + body._id defined', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/schedule')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          memberIds: [memberId],
          date: '2030-06-15',
          startTime: '09:00',
          endTime: '10:00',
        });
      expect(res.status).toBe(201);
      scheduledSessionId = (res.body as { _id: string })._id;
      expect(scheduledSessionId).toBeDefined();
    });

    it('as member → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/schedule')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          memberIds: [memberId],
          date: '2030-06-15',
          startTime: '09:00',
          endTime: '10:00',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/schedule/member/:memberId (Sprint Contract)', () => {
    it('as the member themselves → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/schedule/member/${memberId}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('as different member → 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/schedule/member/${memberId}`)
        .set('Authorization', `Bearer ${member2Token}`);
      expect(res.status).toBe(403);
    });

    it('as trainer (owns member) → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/schedule/member/${memberId}`)
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('DELETE /api/v1/schedule/:id (Sprint Contract)', () => {
    it('owning trainer cancels → 200 + body.status === cancelled', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/schedule/${scheduledSessionId}`)
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      expect((res.body as { status: string }).status).toBe('cancelled');
    });
  });

  // ──────────────────────────────────────────────────────────
  // Sprint Contract: Check-ins
  // ──────────────────────────────────────────────────────────

  const CHECK_IN_PAYLOAD = {
    sleepQuality: 7,
    stress: 5,
    fatigue: 4,
    hunger: 6,
    recovery: 8,
    energy: 7,
    digestion: 8,
    stuckToDiet: 'yes' as const,
  };

  describe('POST /api/v1/check-ins (Sprint Contract)', () => {
    it('as member for today → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/check-ins')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(CHECK_IN_PAYLOAD);
      expect(res.status).toBe(201);
    });

    it('second check-in same day → 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/check-ins')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(CHECK_IN_PAYLOAD);
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/check-ins (Sprint Contract)', () => {
    it('as member → 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/check-ins')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
      const body = res.body as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Sprint Contract: Check-in Config
  // ──────────────────────────────────────────────────────────

  describe('PUT /api/v1/check-in-config (Sprint Contract)', () => {
    it('as trainer for owned member → 200', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/check-in-config')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          memberId,
          dayOfWeek: 1,
          hour: 9,
          minute: 0,
          active: true,
        });
      expect(res.status).toBe(200);
    });

    it('as trainer for foreign member → 404', async () => {
      // Create a second trainer with their own member
      const foreignMemberInvite = await inviteRepo.create({
        token: 'schedule-foreign-trainer-invite',
        role: 'trainer',
        invitedBy: trainerId,
        recipientEmail: 'trainer2-schedule@example.com',
        expiresAt: new Date(Date.now() + 3_600_000),
      });
      const t2Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Tina',
          lastName: 'Trainer2',
          email: 'trainer2-schedule@example.com',
          password: 'Trainer2Pass123!',
          token: foreignMemberInvite.token,
        });
      expect(t2Res.status).toBe(201);
      const t2Token = (t2Res.body as LoginBody).access_token;

      // trainer2 tries to set config for member belonging to trainer1
      const res = await request(app.getHttpServer())
        .put('/api/v1/check-in-config')
        .set('Authorization', `Bearer ${t2Token}`)
        .send({
          memberId,
          dayOfWeek: 1,
          hour: 9,
          minute: 0,
          active: true,
        });
      expect(res.status).toBe(404);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { Connection, Types } from 'mongoose';
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
  firstName: 'Owen',
  lastName: 'Owner',
  email: 'owner-progress-billing@example.com',
  password: 'OwnerPass123!',
};

const TRAINER = {
  firstName: 'Tara',
  lastName: 'Trainer',
  email: 'trainer-progress-billing@example.com',
  password: 'TrainerPass123!',
};

const TRAINER2 = {
  firstName: 'Tom',
  lastName: 'Trainer2',
  email: 'trainer2-progress-billing@example.com',
  password: 'Trainer2Pass123!',
};

const MEMBER = {
  firstName: 'Mary',
  lastName: 'Member',
  email: 'member-progress-billing@example.com',
  password: 'MemberPass123!',
};

const MEMBER2 = {
  firstName: 'Mike',
  lastName: 'Member2',
  email: 'member2-progress-billing@example.com',
  password: 'Member2Pass123!',
};

describe('Progress & Billing (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let connection: Connection;
  let inviteRepo: InviteRepository;
  let throttlerStorage: ClearableStorage;

  let ownerToken: string;
  let ownerId: string;
  let trainerToken: string;
  let trainerId: string;
  let trainer2Token: string;
  let memberToken: string;
  let memberId: string;
  let member2Token: string;

  async function clearCollections(): Promise<void> {
    const db = connection.db;
    if (!db) return;
    const names = [
      'users',
      'invitetokens',
      'passwordresettokens',
      'refreshtokens',
      'userprofiles',
      'personalbestsmodels',
      'workoutsessions',
      'scheduledsessions',
      'servicetypes',
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
    ownerToken = (ownerRes.body as LoginBody).access_token;
    ownerId = (ownerRes.body as LoginBody).user.id;

    // 2. Register trainer (belongs to owner)
    const trainerInvite = await inviteRepo.create({
      token: 'prog-billing-trainer-invite',
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

    // 3. Register second trainer (for foreign-member test)
    const trainer2Invite = await inviteRepo.create({
      token: 'prog-billing-trainer2-invite',
      role: 'trainer',
      invitedBy: ownerId,
      recipientEmail: TRAINER2.email,
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    const trainer2Res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...TRAINER2, token: trainer2Invite.token });
    expect(trainer2Res.status).toBe(201);
    trainer2Token = (trainer2Res.body as LoginBody).access_token;

    // 4. Register member (belongs to trainer)
    const memberInvite = await inviteRepo.create({
      token: 'prog-billing-member-invite',
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

    // 5. Register second member (belongs to trainer, for cross-member access test)
    const member2Invite = await inviteRepo.create({
      token: 'prog-billing-member2-invite',
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
  // Progress — Sprint Contract
  // ──────────────────────────────────────────────────────────

  describe('GET /api/v1/progress/:memberId (Sprint Contract)', () => {
    it('owning trainer → 200 + body.oneRepMaxTrend defined', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/progress/${memberId}`)
        .set('Authorization', `Bearer ${trainerToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { oneRepMaxTrend: unknown };
      expect(body.oneRepMaxTrend).toBeDefined();
    });

    it('foreign trainer → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/progress/${memberId}`)
        .set('Authorization', `Bearer ${trainer2Token}`);

      expect(res.status).toBe(404);
    });

    it('owner → 200 + body.oneRepMaxTrend defined', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/progress/${memberId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { oneRepMaxTrend: unknown };
      expect(body.oneRepMaxTrend).toBeDefined();
    });

    it('member → 200 for own progress', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/progress/${memberId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { oneRepMaxTrend: unknown };
      expect(body.oneRepMaxTrend).toBeDefined();
    });

    it('GET /progress/:memberId as different member → 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/progress/${memberId}`)
        .set('Authorization', `Bearer ${member2Token}`);
      expect(res.status).toBe(403);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Service Types — Sprint Contract
  // ──────────────────────────────────────────────────────────

  describe('POST /api/v1/service-types (Sprint Contract)', () => {
    it('owner with valid payload → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-types')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'PT Session', durationMin: 60, pricePerSession: 120 });

      expect(res.status).toBe(201);
      const body = res.body as {
        serviceType: { _id: string; name: string; isActive: boolean };
      };
      expect(body.serviceType._id).toBeDefined();
      expect(body.serviceType.name).toBe('PT Session');
      expect(body.serviceType.isActive).toBe(true);
    });

    it('member → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-types')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Group Class', durationMin: 45, pricePerSession: 30 });

      expect(res.status).toBe(403);
    });

    it('trainer → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-types')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Group Class', durationMin: 45, pricePerSession: 30 });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/service-types/active (Sprint Contract)', () => {
    it('owner → 200 + every item has active === true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/service-types/active')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { serviceTypes: { isActive: boolean }[] };
      expect(Array.isArray(body.serviceTypes)).toBe(true);
      for (const st of body.serviceTypes) {
        expect(st.isActive).toBe(true);
      }
    });

    it('trainer → 200 + every item has active === true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/service-types/active')
        .set('Authorization', `Bearer ${trainerToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { serviceTypes: { isActive: boolean }[] };
      for (const st of body.serviceTypes) {
        expect(st.isActive).toBe(true);
      }
    });
  });

  // ──────────────────────────────────────────────────────────
  // Billing — Sprint Contract
  // ──────────────────────────────────────────────────────────

  describe('GET /api/v1/billing/member/:id (Sprint Contract)', () => {
    let serviceTypeId: string;

    beforeAll(async () => {
      // Create a service type for billing
      const stRes = await request(app.getHttpServer())
        .post('/api/v1/service-types')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Billing Test Service',
          durationMin: 60,
          pricePerSession: 100,
        });
      expect(stRes.status).toBe(201);
      serviceTypeId = (stRes.body as { serviceType: { _id: string } })
        .serviceType._id;

      // Insert sessions directly into the DB:
      // - 2 past completed scheduled sessions (should count)
      // - 1 cancelled session (should be excluded)
      // - 1 future session (should be excluded)
      const db = connection.db;
      if (!db) return;

      const now = new Date();
      const past1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const past2 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await db.collection('scheduledsessions').insertMany([
        {
          trainerId: new Types.ObjectId(trainerId),
          memberIds: [new Types.ObjectId(memberId)],
          date: past1,
          startTime: '09:00',
          endTime: '10:00',
          status: 'scheduled',
          serviceTypeId: new Types.ObjectId(serviceTypeId),
          reminderSentAt: null,
          createdAt: past1,
          updatedAt: past1,
        },
        {
          trainerId: new Types.ObjectId(trainerId),
          memberIds: [new Types.ObjectId(memberId)],
          date: past2,
          startTime: '10:00',
          endTime: '11:00',
          status: 'scheduled',
          serviceTypeId: new Types.ObjectId(serviceTypeId),
          reminderSentAt: null,
          createdAt: past2,
          updatedAt: past2,
        },
        {
          trainerId: new Types.ObjectId(trainerId),
          memberIds: [new Types.ObjectId(memberId)],
          date: past1,
          startTime: '14:00',
          endTime: '15:00',
          status: 'cancelled',
          serviceTypeId: new Types.ObjectId(serviceTypeId),
          reminderSentAt: null,
          createdAt: past1,
          updatedAt: past1,
        },
        {
          trainerId: new Types.ObjectId(trainerId),
          memberIds: [new Types.ObjectId(memberId)],
          date: future,
          startTime: '09:00',
          endTime: '10:00',
          status: 'scheduled',
          serviceTypeId: new Types.ObjectId(serviceTypeId),
          reminderSentAt: null,
          createdAt: future,
          updatedAt: future,
        },
      ]);
    });

    it('→ 200 + body.total is number + body.lines excludes cancelled/future sessions', async () => {
      // Use a date range spanning both past sessions and up to now
      const from = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const to = new Date(Date.now() + 1 * 60 * 1000).toISOString(); // 1 minute in future (effectiveTo = now)

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/billing/member/${memberId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        )
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      const body = res.body as {
        total: number;
        count: number;
        lines: { sessionId: string; price: number }[];
      };

      // total must be a number
      expect(typeof body.total).toBe('number');
      // 2 past+completed sessions at 100 each = 200
      expect(body.total).toBe(200);
      // lines count = 2 (cancelled and future excluded)
      expect(body.lines.length).toBe(2);
    });

    it('owning trainer → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/billing/member/${memberId}`)
        .set('Authorization', `Bearer ${trainerToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { total: number };
      expect(typeof body.total).toBe('number');
    });
  });
});

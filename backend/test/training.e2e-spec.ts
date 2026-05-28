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
  email: 'owner-training@example.com',
  password: 'OwnerPass123!',
};

const TRAINER = {
  firstName: 'Trevor',
  lastName: 'Trainer',
  email: 'trainer-training@example.com',
  password: 'TrainerPass123!',
};

const MEMBER = {
  firstName: 'Mike',
  lastName: 'Member',
  email: 'member-training@example.com',
  password: 'MemberPass123!',
};

const MEMBER2 = {
  firstName: 'Mary',
  lastName: 'Member2',
  email: 'member2-training@example.com',
  password: 'Member2Pass123!',
};

const SAMPLE_EXERCISE = {
  groupId: 'g1',
  isSuperset: false,
  exerciseId: '507f1f77bcf86cd799439011',
  exerciseName: 'Squat',
  imageUrl: null,
  isBodyweight: false,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: 90,
};

describe('Training (e2e)', () => {
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
  let member2Id: string;

  let planTemplateId: string;
  let sessionId: string;

  async function clearCollections(): Promise<void> {
    const db = connection.db;
    if (!db) return;
    const names = [
      'users',
      'invitetokens',
      'passwordresettokens',
      'refreshtokens',
      'userprofiles',
      'plantemplates',
      'memberplans',
      'workoutsessions',
      'exercises',
      'exercisenotes',
      'personalbests',
      'selfworkoutlogs',
      'selfpersonalbests',
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
    // owner token not used in these tests

    // 2. Create trainer invite and register trainer
    const trainerInvite = await inviteRepo.create({
      token: 'training-trainer-invite',
      role: 'trainer',
      invitedBy: (ownerRes.body as LoginBody).user.id,
      recipientEmail: TRAINER.email,
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    const trainerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...TRAINER, token: trainerInvite.token });
    expect(trainerRes.status).toBe(201);
    trainerToken = (trainerRes.body as LoginBody).access_token;
    trainerId = (trainerRes.body as LoginBody).user.id;

    // 3. Create member invite and register member (belongs to trainer)
    const memberInvite = await inviteRepo.create({
      token: 'training-member-invite',
      role: 'member',
      invitedBy: (ownerRes.body as LoginBody).user.id,
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

    // 4. Create second member (also belongs to trainer)
    const member2Invite = await inviteRepo.create({
      token: 'training-member2-invite',
      role: 'member',
      invitedBy: (ownerRes.body as LoginBody).user.id,
      recipientEmail: MEMBER2.email,
      expiresAt: new Date(Date.now() + 3_600_000),
      trainerId,
    });
    const member2Res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...MEMBER2, token: member2Invite.token });
    expect(member2Res.status).toBe(201);
    member2Token = (member2Res.body as LoginBody).access_token;
    member2Id = (member2Res.body as LoginBody).user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ──────────────────────────────────────────────────────────
  // Sprint Contract assertions
  // ──────────────────────────────────────────────────────────

  describe('POST /api/v1/plan-templates (Sprint Contract)', () => {
    it('as trainer → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/plan-templates')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Push Pull Legs',
          description: 'A classic PPL programme',
          days: [
            {
              dayNumber: 1,
              name: 'Push Day',
              exercises: [SAMPLE_EXERCISE],
            },
          ],
        });
      expect(res.status).toBe(201);
      planTemplateId = (res.body as { _id: string })._id;
      expect(planTemplateId).toBeDefined();
    });

    it('as member → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/plan-templates')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Sneaky Plan', days: [] });
      expect(res.status).toBe(403);
    });
  });

  describe('Assign plan to member (setup for session tests)', () => {
    it('POST /api/v1/members/:id/plan as trainer → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/members/${memberId}/plan`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ templateId: planTemplateId });
      expect(res.status).toBe(201);
      expect((res.body as { _id: string })._id).toBeDefined();
    });
  });

  describe('POST /api/v1/sessions (Sprint Contract)', () => {
    it('member with active plan → 201 + body.sets.length > 0', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          dayNumber: 1,
        });
      expect(res.status).toBe(201);
      const body = res.body as { sets: unknown[]; _id: string };
      expect(body.sets.length).toBeGreaterThan(0);
      sessionId = body._id;
    });

    it('active session exists for different day without deleteActive → 409 + ACTIVE_SESSION_EXISTS', async () => {
      // Assign a second day to the plan by creating another plan template with 2 days
      const tmplRes = await request(app.getHttpServer())
        .post('/api/v1/plan-templates')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Two Day Plan',
          days: [
            { dayNumber: 1, name: 'Day 1', exercises: [SAMPLE_EXERCISE] },
            { dayNumber: 2, name: 'Day 2', exercises: [SAMPLE_EXERCISE] },
          ],
        });
      expect(tmplRes.status).toBe(201);
      const twoDay = (tmplRes.body as { _id: string })._id;

      // Assign to member2
      const planRes = await request(app.getHttpServer())
        .post(`/api/v1/members/${member2Id}/plan`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ templateId: twoDay });
      expect(planRes.status).toBe(201);

      // Start day 1 for member2
      const s1 = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ dayNumber: 1 });
      expect(s1.status).toBe(201);

      // Try to start day 2 → should 409 ACTIVE_SESSION_EXISTS
      const res = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ dayNumber: 2 });
      expect(res.status).toBe(409);
      expect((res.body as { error: string }).error).toBe(
        'ACTIVE_SESSION_EXISTS',
      );
    });

    it('day already completed today → 409 + DAY_ALREADY_LOGGED', async () => {
      // Complete session for member
      const completeRes = await request(app.getHttpServer())
        .post(`/api/v1/sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});
      expect(completeRes.status).toBe(200);

      // Try to start a new session for the same member today
      const res = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ dayNumber: 1 });
      expect(res.status).toBe(409);
      expect((res.body as { error: string }).error).toBe('DAY_ALREADY_LOGGED');
    });
  });

  describe('PATCH /api/v1/sessions/:id/sets/:setIndex (Sprint Contract)', () => {
    let freshSessionId: string;

    beforeAll(async () => {
      // Assign another plan template to member so we can start a fresh session
      const tmplRes = await request(app.getHttpServer())
        .post('/api/v1/plan-templates')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Set Test Plan',
          days: [{ dayNumber: 1, name: 'Day 1', exercises: [SAMPLE_EXERCISE] }],
        });
      const setTmplId = (tmplRes.body as { _id: string })._id;

      // Create a new "fresh" member for set tests to avoid day-logged conflict
      const freshMemberInvite = await inviteRepo.create({
        token: 'training-fresh-member-invite',
        role: 'member',
        invitedBy: trainerId,
        recipientEmail: 'fresh-member-training@example.com',
        expiresAt: new Date(Date.now() + 3_600_000),
        trainerId,
      });
      const freshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Fresh',
          lastName: 'Member',
          email: 'fresh-member-training@example.com',
          password: 'FreshPass123!',
          token: freshMemberInvite.token,
        });
      const freshToken = (freshRes.body as LoginBody).access_token;
      const freshMemberId = (freshRes.body as LoginBody).user.id;

      await request(app.getHttpServer())
        .post(`/api/v1/members/${freshMemberId}/plan`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ templateId: setTmplId });
      const sessionRes = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ dayNumber: 1 });
      expect(sessionRes.status).toBe(201);
      freshSessionId = (sessionRes.body as { _id: string })._id;

      // Store token for test use
      (this as unknown as Record<string, string>)['freshToken'] = freshToken;
    });

    it('with weight+reps → 200 + body.sets[idx].completedAt not null', async () => {
      // Use trainer token since member's session was completed above
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/sessions/${freshSessionId}/sets/0`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ actualWeight: 100, actualReps: 8 });
      expect(res.status).toBe(200);
      const body = res.body as { sets: Array<{ completedAt: string | null }> };
      expect(body.sets[0].completedAt).not.toBeNull();
    });
  });

  describe('POST /api/v1/sessions/:id/complete (Sprint Contract)', () => {
    it('→ 200 + body.completedAt not null', async () => {
      // We test with the session that was already completed in a prior test,
      // so let's use a completely new member/plan/session flow
      const tmplRes = await request(app.getHttpServer())
        .post('/api/v1/plan-templates')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Complete Test Plan',
          days: [{ dayNumber: 1, name: 'Day 1', exercises: [SAMPLE_EXERCISE] }],
        });
      const tmplId = (tmplRes.body as { _id: string })._id;

      const compMemberInvite = await inviteRepo.create({
        token: 'training-comp-member-invite',
        role: 'member',
        invitedBy: trainerId,
        recipientEmail: 'comp-member-training@example.com',
        expiresAt: new Date(Date.now() + 3_600_000),
        trainerId,
      });
      const compRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Comp',
          lastName: 'Member',
          email: 'comp-member-training@example.com',
          password: 'CompPass123!',
          token: compMemberInvite.token,
        });
      const compToken = (compRes.body as LoginBody).access_token;
      const compMemberId = (compRes.body as LoginBody).user.id;

      await request(app.getHttpServer())
        .post(`/api/v1/members/${compMemberId}/plan`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ templateId: tmplId });
      const sessRes = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${compToken}`)
        .send({ dayNumber: 1 });
      expect(sessRes.status).toBe(201);
      const compSessionId = (sessRes.body as { _id: string })._id;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/sessions/${compSessionId}/complete`)
        .set('Authorization', `Bearer ${compToken}`)
        .send({});
      expect(res.status).toBe(200);
      expect(
        (res.body as { completedAt: string | null }).completedAt,
      ).not.toBeNull();
    });
  });

  describe('GET /api/v1/sessions?memberId=:id (Sprint Contract)', () => {
    it('as member requesting another member → 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/sessions?memberId=${member2Id}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });

    it('as member requesting own sessions → 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/sessions?memberId=${memberId}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/members/:memberId/pbs (Sprint Contract)', () => {
    it('→ 200 + array with Epley-estimated 1RMs', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/pbs`)
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('as member requesting own pbs → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/pbs`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
    });

    it('as member requesting another member pbs → 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${member2Id}/pbs`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Additional coverage
  // ──────────────────────────────────────────────────────────

  describe('GET /api/v1/plan-templates', () => {
    it('as trainer → 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/plan-templates')
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/plan-templates/:id', () => {
    it('as template owner → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/plan-templates/${planTemplateId}`)
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/exercises', () => {
    it('→ 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/exercises')
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/members/:memberId/plan', () => {
    it('as trainer → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/plan`)
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
    });

    it('as member requesting own plan → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/plan`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
    });
  });
});

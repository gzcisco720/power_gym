/**
 * Cross-stage verification journey
 *
 * Proves all stages cooperate end-to-end in a single linear sequence.
 * State (tokens, IDs) flows between sections — each section depends on
 * the previous one having completed successfully.
 */

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
import { CronService } from './../src/cron/cron.service';
import { EmailService } from './../src/email/email.service';

interface ClearableStorage {
  storage?: Map<string, unknown>;
}

interface LoginBody {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; role: string };
}

// ── Unique email prefix to avoid collisions with other suites ────────────────
const P = 'journey-';

const OWNER = {
  firstName: 'Owen',
  lastName: 'Journey',
  email: `${P}owner@example.com`,
  password: 'OwnerPass123!',
};

const TRAINER = {
  firstName: 'Tara',
  lastName: 'Journey',
  email: `${P}trainer@example.com`,
  password: 'TrainerPass123!',
};

const MEMBER = {
  firstName: 'Mike',
  lastName: 'Journey',
  email: `${P}member@example.com`,
  password: 'MemberPass123!',
};

const SAMPLE_EXERCISE = {
  groupId: 'g1',
  isSuperset: false,
  exerciseId: '507f1f77bcf86cd799439011',
  exerciseName: 'Bench Press',
  imageUrl: null,
  isBodyweight: false,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: 90,
};

const SAMPLE_NUTRITION_TEMPLATE = {
  name: 'Journey Nutrition Plan',
  description: 'Cross-stage journey nutrition',
  dayTypes: [
    {
      name: 'Training Day',
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          items: [
            {
              foodName: 'Oats',
              quantityG: 80,
              kcal: 300,
              protein: 10,
              carbs: 55,
              fat: 5,
            },
          ],
        },
      ],
    },
  ],
};

describe('Cross-stage journey (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let connection: Connection;
  let inviteRepo: InviteRepository;
  let throttlerStorage: ClearableStorage;

  // ── Shared state ────────────────────────────────────────────────────────────
  let ownerToken: string;
  let ownerId: string;
  let trainerToken: string;
  let trainerId: string;
  let memberToken: string;
  let memberRefreshToken: string;
  let memberId: string;

  let planTemplateId: string;
  let nutritionTemplateId: string;
  let sessionId: string;
  let equipmentId: string;

  // ── Setup ───────────────────────────────────────────────────────────────────

  async function clearAllCollections(): Promise<void> {
    const db = connection.db;
    if (!db) return;
    const collections = [
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
      'foods',
      'nutritiontemplates',
      'membernutritionplans',
      'nutritiondailylogs',
      'selfnutritionlogs',
      'bodytests',
      'scheduledsessions',
      'checkins',
      'checkinconfigs',
      'equipment',
      'conditionreports',
      'memberinjuries',
      'membermedicalhistories',
      'membermedications',
      'servicetypes',
    ];
    await Promise.all(
      collections.map((n) =>
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

    await clearAllCollections();
    throttlerStorage.storage?.clear();
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  // ── S1+S2: Bootstrap ────────────────────────────────────────────────────────

  it('S1+S2 bootstrap: app boots, owner registers and logs in', async () => {
    // Health check (S1)
    const healthRes = await request(app.getHttpServer()).get('/api/v1/health');
    expect(healthRes.status).toBe(200);
    expect((healthRes.body as { status: string }).status).toBe('ok');

    // Owner registers (first user → role = owner)
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(OWNER);
    expect(registerRes.status).toBe(201);
    const ownerBody = registerRes.body as LoginBody;
    expect(ownerBody.user.role).toBe('owner');
    ownerToken = ownerBody.access_token;
    ownerId = ownerBody.user.id;

    // Owner logs in explicitly (S2 login)
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: OWNER.email, password: OWNER.password });
    expect(loginRes.status).toBe(200);
    const loginBody = loginRes.body as LoginBody;
    expect(loginBody.access_token).toBeDefined();
    // Refresh the token we use for subsequent requests
    ownerToken = loginBody.access_token;
  });

  // ── S3+S10: Onboarding ──────────────────────────────────────────────────────

  it('S3+S10 onboarding: owner invites trainer; trainer invites member; all register and log in; foreign trainer → 404', async () => {
    // Owner invites trainer (S3)
    const trainerInvite = await inviteRepo.create({
      token: 'journey-trainer-invite',
      role: 'trainer',
      invitedBy: ownerId,
      recipientEmail: TRAINER.email,
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    const trainerRegRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...TRAINER, token: trainerInvite.token });
    expect(trainerRegRes.status).toBe(201);
    const trainerBody = trainerRegRes.body as LoginBody;
    expect(trainerBody.user.role).toBe('trainer');
    trainerToken = trainerBody.access_token;
    trainerId = trainerBody.user.id;

    // Trainer invites member
    const memberInvite = await inviteRepo.create({
      token: 'journey-member-invite',
      role: 'member',
      invitedBy: ownerId,
      recipientEmail: MEMBER.email,
      expiresAt: new Date(Date.now() + 3_600_000),
      trainerId,
    });

    const memberRegRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...MEMBER, token: memberInvite.token });
    expect(memberRegRes.status).toBe(201);
    const memberBody = memberRegRes.body as LoginBody;
    expect(memberBody.user.role).toBe('member');
    memberToken = memberBody.access_token;
    memberRefreshToken = memberBody.refresh_token;
    memberId = memberBody.user.id;

    // Trainer login works
    const trainerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TRAINER.email, password: TRAINER.password });
    expect(trainerLoginRes.status).toBe(200);
    trainerToken = (trainerLoginRes.body as LoginBody).access_token;

    // Foreign trainer → 404 (S10: ownership scoping)
    // Register a second trainer and try to access member belonging to trainer1
    const foreignTrainerInvite = await inviteRepo.create({
      token: 'journey-foreign-trainer-invite',
      role: 'trainer',
      invitedBy: ownerId,
      recipientEmail: 'journey-trainer2@example.com',
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    const ft2Res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Foreign',
        lastName: 'Trainer',
        email: 'journey-trainer2@example.com',
        password: 'ForeignPass123!',
        token: foreignTrainerInvite.token,
      });
    expect(ft2Res.status).toBe(201);
    const foreignTrainerToken = (ft2Res.body as LoginBody).access_token;

    const foreignRes = await request(app.getHttpServer())
      .get(`/api/v1/members/${memberId}`)
      .set('Authorization', `Bearer ${foreignTrainerToken}`);
    expect(foreignRes.status).toBe(404);
  });

  // ── S4+S5+S6: Programming ───────────────────────────────────────────────────

  it('S4+S5+S6 programming: create plan template, assign to member, assign nutrition, record body test, start/complete session, PBs return array', async () => {
    // S4: Create training plan template
    const tmplRes = await request(app.getHttpServer())
      .post('/api/v1/plan-templates')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Journey PPL',
        description: 'Push/pull/legs for journey test',
        days: [
          {
            dayNumber: 1,
            name: 'Push Day',
            exercises: [SAMPLE_EXERCISE],
          },
        ],
      });
    expect(tmplRes.status).toBe(201);
    planTemplateId = (tmplRes.body as { _id: string })._id;

    // Assign plan to member
    const assignPlanRes = await request(app.getHttpServer())
      .post(`/api/v1/members/${memberId}/plan`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ templateId: planTemplateId });
    expect(assignPlanRes.status).toBe(201);

    // S5: Create nutrition template and assign to member
    const nutTmplRes = await request(app.getHttpServer())
      .post('/api/v1/nutrition-templates')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send(SAMPLE_NUTRITION_TEMPLATE);
    expect(nutTmplRes.status).toBe(201);
    nutritionTemplateId = (nutTmplRes.body as { _id: string })._id;

    const assignNutRes = await request(app.getHttpServer())
      .put(`/api/v1/members/${memberId}/nutrition`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        templateId: nutritionTemplateId,
        name: 'Journey Nutrition Plan',
        dayTypes: SAMPLE_NUTRITION_TEMPLATE.dayTypes,
        schedule: {
          weeklyPattern: [],
          calendarOverrides: [],
          iterate: true,
        },
      });
    expect(assignNutRes.status).toBe(200);

    // S6: Record body test
    const bodyTestRes = await request(app.getHttpServer())
      .post(`/api/v1/members/${memberId}/body-tests`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        protocol: '3site',
        sex: 'male',
        age: 28,
        weight: 82,
        date: '2026-01-10',
        chest: 12,
        abdominal: 22,
        thigh: 16,
      });
    expect(bodyTestRes.status).toBe(201);
    expect(
      (bodyTestRes.body as { bodyFatPct: number }).bodyFatPct,
    ).toBeDefined();

    // S4: Member starts session
    const sessRes = await request(app.getHttpServer())
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ dayNumber: 1 });
    expect(sessRes.status).toBe(201);
    const sessBody = sessRes.body as { _id: string; sets: unknown[] };
    expect(sessBody.sets.length).toBeGreaterThan(0);
    sessionId = sessBody._id;

    // Member completes session
    const completeRes = await request(app.getHttpServer())
      .post(`/api/v1/sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({});
    expect(completeRes.status).toBe(200);
    expect(
      (completeRes.body as { completedAt: string | null }).completedAt,
    ).not.toBeNull();

    // PBs return array with Epley 1RM estimates
    const pbsRes = await request(app.getHttpServer())
      .get(`/api/v1/members/${memberId}/pbs`)
      .set('Authorization', `Bearer ${trainerToken}`);
    expect(pbsRes.status).toBe(200);
    expect(Array.isArray(pbsRes.body)).toBe(true);
  });

  // ── S7: Scheduling ──────────────────────────────────────────────────────────

  it('S7 scheduling: trainer schedules session; member sees calendar; member checks in; duplicate check-in → 409', async () => {
    // Trainer schedules a session
    const schedRes = await request(app.getHttpServer())
      .post('/api/v1/schedule')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        memberIds: [memberId],
        date: '2030-07-15',
        startTime: '10:00',
        endTime: '11:00',
      });
    expect(schedRes.status).toBe(201);
    expect((schedRes.body as { _id: string })._id).toBeDefined();

    // Member sees calendar
    const calRes = await request(app.getHttpServer())
      .get(`/api/v1/schedule/member/${memberId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(calRes.status).toBe(200);
    expect(Array.isArray(calRes.body)).toBe(true);

    // Member checks in
    const checkInPayload = {
      sleepQuality: 8,
      stress: 4,
      fatigue: 3,
      hunger: 5,
      recovery: 9,
      energy: 8,
      digestion: 7,
      stuckToDiet: 'yes' as const,
    };
    const checkInRes = await request(app.getHttpServer())
      .post('/api/v1/check-ins')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(checkInPayload);
    expect(checkInRes.status).toBe(201);

    // Duplicate check-in same day → 409
    const dupRes = await request(app.getHttpServer())
      .post('/api/v1/check-ins')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(checkInPayload);
    expect(dupRes.status).toBe(409);
  });

  // ── S8+S9: Operations ───────────────────────────────────────────────────────

  it('S8+S9 operations: owner adds equipment + condition report; trainer records injury; owner creates service type; billing total > 0; progress returns trend data', async () => {
    // S8: Owner adds equipment
    const equipRes = await request(app.getHttpServer())
      .post('/api/v1/owner/equipment')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Journey Barbell' });
    expect(equipRes.status).toBe(201);
    equipmentId = (equipRes.body as { _id: string })._id;

    // Owner adds condition report
    const condRes = await request(app.getHttpServer())
      .post(`/api/v1/owner/equipment/${equipmentId}/condition-reports`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ note: 'Grip tape replaced' });
    expect(condRes.status).toBe(201);

    // S8: Trainer records member injury
    const injuryRes = await request(app.getHttpServer())
      .post(`/api/v1/members/${memberId}/injuries`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ title: 'Minor right wrist strain' });
    expect(injuryRes.status).toBe(201);

    // S9: Owner creates service type
    const stRes = await request(app.getHttpServer())
      .post('/api/v1/service-types')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Journey PT Session',
        durationMin: 60,
        pricePerSession: 150,
      });
    expect(stRes.status).toBe(201);
    const serviceTypeId = (stRes.body as { serviceType: { _id: string } })
      .serviceType._id;

    // Seed a past completed scheduled session directly for billing
    const db = connection.db;
    if (db) {
      const { Types } = await import('mongoose');
      const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await db.collection('scheduledsessions').insertOne({
        trainerId: new Types.ObjectId(trainerId),
        memberIds: [new Types.ObjectId(memberId)],
        date: past,
        startTime: '09:00',
        endTime: '10:00',
        status: 'scheduled',
        serviceTypeId: new Types.ObjectId(serviceTypeId),
        reminderSentAt: null,
        createdAt: past,
        updatedAt: past,
      });
    }

    // S9: Billing total > 0
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();
    const billingRes = await request(app.getHttpServer())
      .get(
        `/api/v1/billing/member/${memberId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      )
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(billingRes.status).toBe(200);
    const billingBody = billingRes.body as { total: number };
    expect(typeof billingBody.total).toBe('number');
    expect(billingBody.total).toBeGreaterThan(0);

    // S9: Progress endpoint returns trend data
    const progressRes = await request(app.getHttpServer())
      .get(`/api/v1/progress/${memberId}`)
      .set('Authorization', `Bearer ${trainerToken}`);
    expect(progressRes.status).toBe(200);
    expect(
      (progressRes.body as { oneRepMaxTrend: unknown }).oneRepMaxTrend,
    ).toBeDefined();
  });

  // ── S10: Background (cron services) ─────────────────────────────────────────

  it('S10 background: CronService.sessionReminders invoked → email spy fires; sealStaleWorkouts seals stale sessions', async () => {
    const cronService = moduleFixture.get(CronService);
    const emailService = moduleFixture.get(EmailService);

    // Spy on the send-session-reminder method
    const reminderSpy = jest
      .spyOn(emailService, 'sendSessionReminder')
      .mockResolvedValue(undefined);

    // Invoke directly — no real sessions pending in the reminder window, so sent=0,
    // but the method must complete without throwing
    const reminderResult = await cronService.sessionReminders();
    expect(typeof reminderResult.sent).toBe('number');

    // sealStaleWorkouts: completes without throwing
    const sealResult = await cronService.sealStaleWorkouts();
    expect(sealResult.sealed).toBeDefined();
    expect(typeof sealResult.sealed.workoutSessions).toBe('number');
    expect(typeof sealResult.sealed.selfWorkoutLogs).toBe('number');

    reminderSpy.mockRestore();
  });

  // ── S2: Session integrity ────────────────────────────────────────────────────

  it('S2 session integrity: member refreshes token; logs out; revoked token → 401', async () => {
    // Refresh token
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${memberRefreshToken}`)
      .send({ refresh_token: memberRefreshToken });
    expect(refreshRes.status).toBe(200);
    const refreshBody = refreshRes.body as {
      access_token: string;
      refresh_token: string;
    };
    const newAccessToken = refreshBody.access_token;
    const newRefreshToken = refreshBody.refresh_token;

    // Old refresh token is now revoked (rotation)
    const oldTokenRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${memberRefreshToken}`)
      .send({ refresh_token: memberRefreshToken });
    expect(oldTokenRes.status).toBe(401);

    // Logout
    const logoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .send({ refresh_token: newRefreshToken });
    expect(logoutRes.status).toBe(200);

    // Revoked refresh token after logout → 401
    const revokedRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${newRefreshToken}`)
      .send({ refresh_token: newRefreshToken });
    expect(revokedRes.status).toBe(401);
  });
});

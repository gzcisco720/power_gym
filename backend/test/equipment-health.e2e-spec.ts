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
  firstName: 'Owen',
  lastName: 'Owner',
  email: 'owner-equip-health@example.com',
  password: 'OwnerPass123!',
};

const TRAINER = {
  firstName: 'Tara',
  lastName: 'Trainer',
  email: 'trainer-equip-health@example.com',
  password: 'TrainerPass123!',
};

const TRAINER2 = {
  firstName: 'Tom',
  lastName: 'Trainer2',
  email: 'trainer2-equip-health@example.com',
  password: 'Trainer2Pass123!',
};

const MEMBER = {
  firstName: 'Mary',
  lastName: 'Member',
  email: 'member-equip-health@example.com',
  password: 'MemberPass123!',
};

const MEMBER2 = {
  firstName: 'Mike',
  lastName: 'Member2',
  email: 'member2-equip-health@example.com',
  password: 'Member2Pass123!',
};

describe('Equipment & Health (e2e)', () => {
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
  let member2Id: string;

  let equipmentId: string;

  async function clearCollections(): Promise<void> {
    const db = connection.db;
    if (!db) return;
    const names = [
      'users',
      'invitetokens',
      'passwordresettokens',
      'refreshtokens',
      'userprofiles',
      'equipment',
      'conditionreports',
      'memberinjuries',
      'membermedicalhistories',
      'membermedications',
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
      token: 'equip-health-trainer-invite',
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
      token: 'equip-health-trainer2-invite',
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
      token: 'equip-health-member-invite',
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

    // 5. Register second member (belongs to trainer, used for cross-member access tests)
    const member2Invite = await inviteRepo.create({
      token: 'equip-health-member2-invite',
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
    member2Id = (member2Res.body as LoginBody).user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ──────────────────────────────────────────────────────────
  // Equipment — Sprint Contract
  // ──────────────────────────────────────────────────────────

  describe('POST /api/v1/owner/equipment (Sprint Contract)', () => {
    it('owner with name → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/owner/equipment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Barbell' });

      expect(res.status).toBe(201);
      const body = res.body as { _id: string; name: string };
      expect(body._id).toBeDefined();
      expect(body.name).toBe('Barbell');
      equipmentId = body._id;
    });

    it('owner with empty name → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/owner/equipment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });

    it('trainer → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/owner/equipment')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Dumbbell' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/owner/equipment (Sprint Contract)', () => {
    it('member → 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/owner/equipment')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('owner → 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/owner/equipment')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('trainer → 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/owner/equipment')
        .set('Authorization', `Bearer ${trainerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/v1/owner/equipment/:id/condition-reports (Sprint Contract)', () => {
    it('owner → 201 + body.equipmentId defined', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/owner/equipment/${equipmentId}/condition-reports`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Minor wear on grip' });

      expect(res.status).toBe(201);
      const body = res.body as { equipmentId: string; note: string };
      expect(body.equipmentId).toBeDefined();
      expect(body.note).toBe('Minor wear on grip');
    });
  });

  // ──────────────────────────────────────────────────────────
  // Member Health — Sprint Contract
  // ──────────────────────────────────────────────────────────

  describe('POST /api/v1/members/:memberId/injuries (Sprint Contract)', () => {
    it('owning trainer → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/members/${memberId}/injuries`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ title: 'Left knee sprain' });

      expect(res.status).toBe(201);
      const body = res.body as { _id: string; title: string };
      expect(body._id).toBeDefined();
      expect(body.title).toBe('Left knee sprain');
    });

    it('foreign trainer → 404', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/members/${memberId}/injuries`)
        .set('Authorization', `Bearer ${trainer2Token}`)
        .send({ title: 'Shoulder issue' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/members/:memberId/medications (Sprint Contract)', () => {
    it('returns drug warnings when conflicting meds → 201 + Array.isArray(body.warnings)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/members/${memberId}/medications`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'metoprolol',
          purpose: 'Blood pressure control',
          duration: 'long_term',
          startDate: '2026-01-01',
        });

      expect(res.status).toBe(201);
      const body = res.body as { medication: object; warnings: string[] };
      expect(body.medication).toBeDefined();
      expect(Array.isArray(body.warnings)).toBe(true);
      expect(body.warnings.length).toBeGreaterThan(0);
    });

    it('non-conflicting med → 201 + empty warnings array', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/members/${memberId}/medications`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Vitamin D',
          purpose: 'Supplement',
          duration: 'long_term',
          startDate: '2026-01-01',
        });

      expect(res.status).toBe(201);
      const body = res.body as { medication: object; warnings: string[] };
      expect(Array.isArray(body.warnings)).toBe(true);
      expect(body.warnings.length).toBe(0);
    });
  });

  describe('GET /api/v1/members/:memberId/medical-history (Sprint Contract)', () => {
    it('member themselves → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/medical-history`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
    });

    it('owning trainer → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/medical-history`)
        .set('Authorization', `Bearer ${trainerToken}`);

      expect(res.status).toBe(200);
    });

    it('foreign trainer → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/medical-history`)
        .set('Authorization', `Bearer ${trainer2Token}`);

      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Cross-member access — member cannot read another member's data
  // ──────────────────────────────────────────────────────────

  describe('Cross-member health access (Sprint Contract)', () => {
    it('GET /members/:otherId/injuries as member → 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${member2Id}/injuries`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /members/:otherId/medical-history as member → 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${member2Id}/medical-history`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });
  });
});

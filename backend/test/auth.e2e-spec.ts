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

const OWNER = {
  firstName: 'Olivia',
  lastName: 'Owner',
  email: 'owner@example.com',
  password: 'OwnerPass123!',
};

interface LoginBody {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; role: string };
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let connection: Connection;
  let inviteRepo: InviteRepository;
  let throttlerStorage: ClearableStorage;

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
  });

  afterAll(async () => {
    await app.close();
  });

  async function clearCollections(): Promise<void> {
    const db = connection.db;
    if (!db) return;
    const names = [
      'users',
      'invitetokens',
      'passwordresettokens',
      'refreshtokens',
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

  beforeEach(async () => {
    await clearCollections();
    throttlerStorage.storage?.clear();
  });

  async function registerOwner(): Promise<LoginBody> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(OWNER);
    return res.body as LoginBody;
  }

  describe('POST /auth/register', () => {
    it('with no existing users and no token → 201 (creates owner)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(OWNER);
      expect(res.status).toBe(201);
      const body = res.body as LoginBody;
      expect(body.user.role).toBe('owner');
      expect(body.access_token).toBeDefined();
    });

    it('without token when a user already exists → 403', async () => {
      await registerOwner();
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Bob',
          lastName: 'Second',
          email: 'bob@example.com',
          password: 'BobPass123!',
        });
      expect(res.status).toBe(403);
    });

    it('with valid invite token + matching email → 201', async () => {
      const owner = await registerOwner();
      const invite = await inviteRepo.create({
        token: 'invite-token-1',
        role: 'member',
        invitedBy: owner.user.id,
        recipientEmail: 'newmember@example.com',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'New',
          lastName: 'Member',
          email: 'newmember@example.com',
          password: 'MemberPass123!',
          token: invite.token,
        });
      expect(res.status).toBe(201);
      const body = res.body as LoginBody;
      expect(body.user.role).toBe('member');
    });

    it('with valid invite token + mismatched email → 400', async () => {
      const owner = await registerOwner();
      const invite = await inviteRepo.create({
        token: 'invite-token-2',
        role: 'member',
        invitedBy: owner.user.id,
        recipientEmail: 'intended@example.com',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Wrong',
          lastName: 'Email',
          email: 'someoneelse@example.com',
          password: 'MemberPass123!',
          token: invite.token,
        });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('with valid credentials → 200 with tokens and user role', async () => {
      await registerOwner();
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: OWNER.email, password: OWNER.password });
      expect(res.status).toBe(200);
      const body = res.body as LoginBody;
      expect(body.access_token).toBeDefined();
      expect(body.refresh_token).toBeDefined();
      expect(body.user.role).toBeDefined();
    });

    it('with wrong password → 401', async () => {
      await registerOwner();
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: OWNER.email, password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    });
  });

  describe('Protected routes', () => {
    it('GET protected route with no Authorization → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('GET protected route with valid token → 200', async () => {
      const owner = await registerOwner();
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${owner.access_token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /auth/refresh and logout', () => {
    it('with valid refresh token → 200 + access_token', async () => {
      const owner = await registerOwner();
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${owner.refresh_token}`)
        .send({ refresh_token: owner.refresh_token });
      expect(res.status).toBe(200);
      const body = res.body as { access_token: string };
      expect(body.access_token).toBeDefined();
    });

    it('after logout, reuse same refresh token → 401', async () => {
      const owner = await registerOwner();
      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${owner.access_token}`)
        .send({ refresh_token: owner.refresh_token });
      expect(logoutRes.status).toBe(200);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${owner.refresh_token}`)
        .send({ refresh_token: owner.refresh_token });
      expect(res.status).toBe(401);
    });
  });

  describe('Password reset flow', () => {
    it('forgot-password for known email → 200, reset-password → 200, new password logs in', async () => {
      await registerOwner();

      const forgotRes = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: OWNER.email });
      expect(forgotRes.status).toBe(200);
      // Raw token is returned in the response while email delivery is deferred.
      const { resetToken } = forgotRes.body as { resetToken: string };
      expect(resetToken).toBeDefined();

      const newPassword = 'BrandNewPass456!';
      const resetRes = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, password: newPassword });
      expect(resetRes.status).toBe(200);

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: OWNER.email, password: newPassword });
      expect(loginRes.status).toBe(200);
    });
  });

  describe('Rate limiting', () => {
    it('exceeding 10 login attempts in 15 min → 429', async () => {
      await registerOwner();
      let lastStatus = 0;
      for (let i = 0; i < 12; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: OWNER.email, password: 'WrongPassword!' });
        lastStatus = res.status;
      }
      expect(lastStatus).toBe(429);
    });
  });
});

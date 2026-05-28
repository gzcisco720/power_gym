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
  email: 'cco@example.com',
  password: 'OwnerPass123!',
};

describe('Cross-cutting (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let connection: Connection;
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
    throttlerStorage = moduleFixture.get<ClearableStorage>(ThrottlerStorage);
  });

  afterAll(async () => {
    await app.close();
  });

  async function clearCollections(): Promise<void> {
    const db = connection.db;
    if (!db) return;
    await Promise.all(
      ['users', 'invitetokens', 'refreshtokens'].map((n) =>
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
    expect(res.status).toBe(201);
    return res.body as LoginBody;
  }

  // ── Upload ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/upload', () => {
    it('unauthenticated → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/upload')
        .attach('file', Buffer.from('hello'), 'test.txt');
      expect(res.status).toBe(401);
    });

    it('authenticated → 201 + url matches https?://', async () => {
      const { access_token } = await registerOwner();

      const res = await request(app.getHttpServer())
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${access_token}`)
        .attach('file', Buffer.from('hello world'), 'test.png');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('url');
      expect((res.body as { url: string }).url).toMatch(/^https?:\/\//);
    });

    it('authenticated with folder query param → 201 + url contains folder', async () => {
      const { access_token } = await registerOwner();

      const res = await request(app.getHttpServer())
        .post('/api/v1/upload?folder=equipment')
        .set('Authorization', `Bearer ${access_token}`)
        .attach('file', Buffer.from('image data'), 'photo.jpg');

      expect(res.status).toBe(201);
      expect((res.body as { url: string }).url).toContain('equipment');
    });

    it('no file → 400', async () => {
      const { access_token } = await registerOwner();

      const res = await request(app.getHttpServer())
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${access_token}`)
        .set('Content-Type', 'multipart/form-data');

      expect(res.status).toBe(400);
    });
  });
});

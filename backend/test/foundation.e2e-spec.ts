import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';

describe('.env.example config spec', () => {
  it('.env.example contains all required keys', () => {
    const envPath = path.resolve(__dirname, '../.env.example');
    const content = fs.readFileSync(envPath, 'utf-8');
    const requiredKeys = [
      'PORT',
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'JWT_EXPIRY',
      'JWT_REFRESH_EXPIRY',
    ];
    for (const key of requiredKeys) {
      expect(content).toMatch(new RegExp(`^${key}=`, 'm'));
    }
  });
});

describe('Foundation (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health endpoint', () => {
    it('GET /api/v1/health → 200 { status: "ok" }', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res: Response) => {
          const body = res.body as { status: string };
          expect(body.status).toBe('ok');
        });
    });

    it('GET /health (no prefix) → 404', () => {
      return request(app.getHttpServer()).get('/health').expect(404);
    });
  });

  describe('ValidationPipe', () => {
    it('POST /api/v1/health/test-validation with unknown field → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/health/test-validation')
        .send({ name: 'ok', unknownField: 'bad' });
      expect(res.status).toBe(400);
    });
  });

  describe('HttpExceptionFilter', () => {
    it('404 response has { statusCode, message } shape', () => {
      return request(app.getHttpServer())
        .get('/api/v1/nonexistent-route')
        .expect(404)
        .expect((res: Response) => {
          const body = res.body as { statusCode: number; message: string };
          expect(body.statusCode).toBe(404);
          expect(typeof body.message).toBe('string');
        });
    });
  });

  describe('Database connection', () => {
    it('Mongoose readyState is 1 (connected)', () => {
      const connection = moduleFixture.get<Connection>(getConnectionToken());
      expect(connection.readyState).toBe(1);
    });
  });
});

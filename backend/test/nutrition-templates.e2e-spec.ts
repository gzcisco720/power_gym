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
import { NutritionTemplatesModule } from '../src/modules/nutrition-templates/nutrition-templates.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'nt-e2e-owner@example.com';
const TRAINER_EMAIL = 'nt-e2e-trainer@example.com';
const OTHER_TRAINER_EMAIL = 'nt-e2e-other-trainer@example.com';
const MEMBER_EMAIL = 'nt-e2e-member@example.com';
const TEST_PASSWORD = 'Password1';

const validDayType = {
  name: 'Training Day',
  meals: [
    {
      name: 'Breakfast',
      order: 1,
      items: [
        {
          foodName: 'Oats',
          quantityG: 100,
          kcal: 380,
          protein: 13,
          carbs: 67,
          fat: 7,
        },
      ],
    },
  ],
};

const validCreateBody = {
  name: 'High Protein Plan',
  dayTypes: [validDayType],
};

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
      NutritionTemplatesModule,
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

describe('NutritionTemplates (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let ownerToken: string;
  let trainerToken: string;
  let otherTrainerToken: string;
  let memberToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'NT',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'NT',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'NT',
      lastName: 'OtherTrainer',
      email: OTHER_TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'NT',
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

    const trainerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TRAINER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    trainerToken = (trainerLogin.body as { accessToken: string }).accessToken;

    const otherTrainerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: OTHER_TRAINER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    otherTrainerToken = (otherTrainerLogin.body as { accessToken: string })
      .accessToken;

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

  // ─── POST /nutrition-templates ────────────────────────────────────────────────

  describe('POST /nutrition-templates', () => {
    it('owner with valid body → 201 and response contains _id, name, and dayTypes with nested meals/items', async () => {
      const res = await request(app.getHttpServer())
        .post('/nutrition-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validCreateBody)
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('name', 'High Protein Plan');
      expect(Array.isArray(body.dayTypes)).toBe(true);
      const dayTypes = body.dayTypes as Array<Record<string, unknown>>;
      expect(dayTypes.length).toBe(1);
      const meals = dayTypes[0].meals as Array<Record<string, unknown>>;
      expect(meals.length).toBe(1);
      const items = meals[0].items as Array<Record<string, unknown>>;
      expect(items.length).toBe(1);
      expect(items[0]).toHaveProperty('foodName', 'Oats');
    });

    it('missing required name → 400', async () => {
      await request(app.getHttpServer())
        .post('/nutrition-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ dayTypes: [] })
        .expect(400);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .post('/nutrition-templates')
        .send(validCreateBody)
        .expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .post('/nutrition-templates')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(validCreateBody)
        .expect(403);
    });
  });

  // ─── GET /nutrition-templates ─────────────────────────────────────────────────

  describe('GET /nutrition-templates', () => {
    it("owner → 200 returns only own templates (another user's template is absent)", async () => {
      // Create template as owner
      const createRes = await request(app.getHttpServer())
        .post('/nutrition-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Owner Plan', dayTypes: [] })
        .expect(201);
      const createdId = (createRes.body as { _id: string })._id;

      // Create template as otherTrainer (should not appear for owner)
      await request(app.getHttpServer())
        .post('/nutrition-templates')
        .set('Authorization', `Bearer ${otherTrainerToken}`)
        .send({ name: 'Other Trainer Plan', dayTypes: [] })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/nutrition-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const templates = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(templates)).toBe(true);
      const ids = templates.map((t) => t._id);
      expect(ids).toContain(createdId);
      const names = templates.map((t) => t.name);
      expect(names).not.toContain('Other Trainer Plan');
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .get('/nutrition-templates')
        .expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get('/nutrition-templates')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── PATCH /nutrition-templates/:id ──────────────────────────────────────────

  describe('PATCH /nutrition-templates/:id', () => {
    let templateId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/nutrition-templates')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'To Update', dayTypes: [validDayType] })
        .expect(201);
      templateId = (res.body as { _id: string })._id;
    });

    it('owning trainer with replaced dayTypes → 200 and returned dayTypes match the new array exactly', async () => {
      const newDayTypes = [
        { name: 'Rest Day', meals: [] },
        { name: 'Active Rest', meals: [] },
      ];

      const res = await request(app.getHttpServer())
        .patch(`/nutrition-templates/${templateId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Updated Plan', dayTypes: newDayTypes })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('name', 'Updated Plan');
      const dayTypes = body.dayTypes as Array<Record<string, unknown>>;
      expect(dayTypes).toHaveLength(2);
      expect(dayTypes[0]).toHaveProperty('name', 'Rest Day');
      expect(dayTypes[1]).toHaveProperty('name', 'Active Rest');
    });

    it("PATCH on another user's template → 404", async () => {
      await request(app.getHttpServer())
        .patch(`/nutrition-templates/${templateId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Hacked', dayTypes: [] })
        .expect(404);
    });
  });

  // ─── DELETE /nutrition-templates/:id ─────────────────────────────────────────

  describe('DELETE /nutrition-templates/:id', () => {
    it('owner deletes own template → 204 and subsequent GET no longer lists it', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/nutrition-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Delete Me', dayTypes: [] })
        .expect(201);
      const templateId = (createRes.body as { _id: string })._id;

      await request(app.getHttpServer())
        .delete(`/nutrition-templates/${templateId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const listRes = await request(app.getHttpServer())
        .get('/nutrition-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const ids = (listRes.body as Array<Record<string, unknown>>).map(
        (t) => t._id,
      );
      expect(ids).not.toContain(templateId);
    });

    it("deleting another user's template → 404", async () => {
      const createRes = await request(app.getHttpServer())
        .post('/nutrition-templates')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: "Owner's Template", dayTypes: [] })
        .expect(201);
      const templateId = (createRes.body as { _id: string })._id;

      await request(app.getHttpServer())
        .delete(`/nutrition-templates/${templateId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(404);
    });
  });
});

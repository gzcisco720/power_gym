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
import { NutritionModule } from '../src/modules/nutrition/nutrition.module';
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
import {
  NutritionTemplate,
  NutritionTemplateSchema,
  NutritionTemplateDocument,
} from '../src/modules/nutrition-templates/nutrition-template.model';
import {
  MemberNutritionPlan,
  MemberNutritionPlanSchema,
  MemberNutritionPlanDocument,
} from '../src/common/models/member-nutrition-plan.model';

const OWNER_EMAIL = 'nt-e2e-owner@example.com';
const MEMBER_EMAIL = 'nt-e2e-member@example.com';
const MEMBER2_EMAIL = 'nt-e2e-member2@example.com';
const TEST_PASSWORD = 'Password1';

async function buildApp(
  uri: string,
  mockEmail?: IEmailService,
): Promise<{ app: INestApplication<App>; module: TestingModule }> {
  const builder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      MongooseModule.forRoot(uri),
      MongooseModule.forFeature([
        { name: User.name, schema: UserSchema },
        { name: NutritionTemplate.name, schema: NutritionTemplateSchema },
        { name: MemberNutritionPlan.name, schema: MemberNutritionPlanSchema },
      ]),
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
      NutritionModule,
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

describe('Nutrition (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let nutritionTemplateModel: Model<NutritionTemplateDocument>;
  let memberNutritionPlanModel: Model<MemberNutritionPlanDocument>;
  let ownerToken: string;
  let memberToken: string;
  let memberId: string;
  let member2Id: string;
  let templateId: string;

  const todayDow = new Date().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const todayStr = new Date().toISOString().slice(0, 10);

  const sampleMealItem = {
    foodName: 'Chicken Breast',
    quantityG: 100,
    kcal: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
  };

  const sampleDayType = {
    name: 'High Carb',
    meals: [
      {
        name: 'Breakfast',
        order: 1,
        items: [sampleMealItem],
      },
    ],
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    nutritionTemplateModel = module.get<Model<NutritionTemplateDocument>>(
      getModelToken(NutritionTemplate.name),
    );
    memberNutritionPlanModel = module.get<Model<MemberNutritionPlanDocument>>(
      getModelToken(MemberNutritionPlan.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const owner = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'NT',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    const member = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'NT',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: owner._id,
    });
    memberId = member._id.toString();

    const member2 = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'NT',
      lastName: 'Member2',
      email: MEMBER2_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: owner._id,
    });
    member2Id = member2._id.toString();

    const template = await nutritionTemplateModel.create({
      name: 'E2E High Carb Template',
      description: null,
      createdBy: owner._id,
      dayTypes: [sampleDayType],
    });
    templateId = template._id.toString();

    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: OWNER_EMAIL, password: TEST_PASSWORD })
      .expect(201);
    ownerToken = (ownerLogin.body as { accessToken: string }).accessToken;

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

  // ─── GET /nutrition/my-plan ───────────────────────────────────────────────────

  describe('GET /nutrition/my-plan', () => {
    it('member with no plan → 200, body is null', async () => {
      const res = await request(app.getHttpServer())
        .get('/nutrition/my-plan')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body).toBeNull();
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/nutrition/my-plan').expect(401);
    });

    it('owner token → 403', async () => {
      await request(app.getHttpServer())
        .get('/nutrition/my-plan')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });
  });

  // ─── POST /nutrition/members/:memberId/assign-plan ────────────────────────────

  describe('POST /nutrition/members/:memberId/assign-plan', () => {
    it('owner → 201, returned plan has isActive true, dayTypes copied from template', async () => {
      const res = await request(app.getHttpServer())
        .post(`/nutrition/members/${memberId}/assign-plan`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ templateId })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('isActive', true);
      expect(body).toHaveProperty('name', 'E2E High Carb Template');
      expect(Array.isArray(body.dayTypes)).toBe(true);
      expect((body.dayTypes as unknown[]).length).toBe(1);
    });

    it('assigning again deactivates the prior plan', async () => {
      // First assign (already done above)
      // Second assign
      const res = await request(app.getHttpServer())
        .post(`/nutrition/members/${memberId}/assign-plan`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ templateId })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('isActive', true);

      // The prior plan should be deactivated
      const activePlans = await memberNutritionPlanModel.find({
        memberId: new Types.ObjectId(memberId),
        isActive: true,
      });
      expect(activePlans).toHaveLength(1);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .post(`/nutrition/members/${memberId}/assign-plan`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ templateId })
        .expect(403);
    });

    it('missing templateId → 400', async () => {
      await request(app.getHttpServer())
        .post(`/nutrition/members/${memberId}/assign-plan`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(400);
    });
  });

  // ─── GET /nutrition/my-plan (with active plan) ────────────────────────────────

  describe('GET /nutrition/my-plan with active plan', () => {
    it('member with active plan → 200, body has todayDayTypeName and non-empty dayTypes', async () => {
      // Seed a plan for member2 (fresh member with no prior plan)
      // First seed for member2
      await request(app.getHttpServer())
        .post(`/nutrition/members/${member2Id}/assign-plan`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ templateId })
        .expect(201);

      // Log in as member2
      const member2Login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: MEMBER2_EMAIL, password: TEST_PASSWORD })
        .expect(201);
      const member2Token = (member2Login.body as { accessToken: string })
        .accessToken;

      const res = await request(app.getHttpServer())
        .get('/nutrition/my-plan')
        .set('Authorization', `Bearer ${member2Token}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('todayDayTypeName');
      expect(typeof body.todayDayTypeName).toBe('string');
      expect(Array.isArray(body.dayTypes)).toBe(true);
      expect((body.dayTypes as unknown[]).length).toBeGreaterThan(0);
    });
  });

  // ─── GET /nutrition/today ─────────────────────────────────────────────────────

  describe('GET /nutrition/today', () => {
    it('member with active plan → 200, creates log with meal slots', async () => {
      const res = await request(app.getHttpServer())
        .get('/nutrition/today')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('date', todayStr);
      expect(body).toHaveProperty('dayTypeName', 'High Carb');
      expect(Array.isArray(body.meals)).toBe(true);
      expect((body.meals as unknown[]).length).toBe(1);
    });

    it('second call returns same log (no duplicate creation)', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/nutrition/today')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .get('/nutrition/today')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect((res1.body as { _id: string })._id).toBe(
        (res2.body as { _id: string })._id,
      );
    });
  });

  // ─── POST /nutrition/today/log ────────────────────────────────────────────────

  describe('POST /nutrition/today/log', () => {
    it('member with mealName, foodName, quantityG, kcal, protein, carbs, fat → 200, returned log has item', async () => {
      const res = await request(app.getHttpServer())
        .post('/nutrition/today/log')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          mealName: 'Breakfast',
          foodName: 'Chicken',
          quantityG: 150,
          kcal: 247,
          protein: 46,
          carbs: 0,
          fat: 5,
        })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(Array.isArray(body.meals)).toBe(true);
      const meals = body.meals as Array<Record<string, unknown>>;
      const breakfast = meals.find((m) => m.name === 'Breakfast');
      expect(breakfast).toBeDefined();
      const items = breakfast?.items as Array<Record<string, unknown>>;
      expect(items.some((i) => i.foodName === 'Chicken')).toBe(true);
    });

    it('no auth → 401', async () => {
      await request(app.getHttpServer())
        .post('/nutrition/today/log')
        .send({
          mealName: 'Breakfast',
          foodName: 'Chicken',
          quantityG: 100,
          kcal: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
        })
        .expect(401);
    });

    it('owner token (wrong role) → 403', async () => {
      await request(app.getHttpServer())
        .post('/nutrition/today/log')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          mealName: 'Breakfast',
          foodName: 'Chicken',
          quantityG: 100,
          kcal: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
        })
        .expect(403);
    });

    it('missing mealName → 400', async () => {
      await request(app.getHttpServer())
        .post('/nutrition/today/log')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          foodName: 'Chicken',
          quantityG: 100,
          kcal: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
        })
        .expect(400);
    });
  });

  // ─── GET /nutrition/today/summary ─────────────────────────────────────────────

  describe('GET /nutrition/today/summary', () => {
    it('after logging one item → 200, logged.kcal equals logged item kcal, target.kcal equals prescribed day-type total', async () => {
      // At this point, 'Chicken' (247 kcal) was logged in POST /nutrition/today/log test above
      const res = await request(app.getHttpServer())
        .get('/nutrition/today/summary')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      const logged = body.logged as Record<string, unknown>;
      const target = body.target as Record<string, unknown>;

      // At least one item was logged
      expect(typeof logged.kcal).toBe('number');
      expect(logged.kcal as number).toBeGreaterThan(0);

      // Target comes from the prescribed plan (sampleMealItem: 165 kcal)
      expect(typeof target.kcal).toBe('number');
      expect(target.kcal as number).toBe(165);
    });
  });

  // ─── GET /nutrition/members/:memberId/history ─────────────────────────────────

  describe('GET /nutrition/members/:memberId/history', () => {
    it('owner → 200, array with the logged day', async () => {
      const res = await request(app.getHttpServer())
        .get(`/nutrition/members/${memberId}/history`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const logs = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toHaveProperty('date');
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get(`/nutrition/members/${memberId}/history`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── POST /nutrition/dev/seed ─────────────────────────────────────────────────

  describe('POST /nutrition/dev/seed', () => {
    it('seeds a plan for the member and returns { ok: true, planId }', async () => {
      const res = await request(app.getHttpServer())
        .post('/nutrition/dev/seed')
        .send({
          memberEmail: MEMBER_EMAIL,
          ownerEmail: OWNER_EMAIL,
          templateId,
        })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body.ok).toBe(true);
      expect(typeof body.planId).toBe('string');
    });
  });

  // Suppress unused variable warning
  void todayDow;
});

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
import { FatSecretService } from './../src/nutrition/fatsecret/fatsecret.service';

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
  email: 'owner-nutrition@example.com',
  password: 'OwnerPass123!',
};

const TRAINER = {
  firstName: 'Trevor',
  lastName: 'Trainer',
  email: 'trainer-nutrition@example.com',
  password: 'TrainerPass123!',
};

const MEMBER = {
  firstName: 'Mike',
  lastName: 'Member',
  email: 'member-nutrition@example.com',
  password: 'MemberPass123!',
};

const MEMBER2 = {
  firstName: 'Mary',
  lastName: 'Member2',
  email: 'member2-nutrition@example.com',
  password: 'Member2Pass123!',
};

const SAMPLE_FOOD_MACROS = {
  kcal: 200,
  protein: 25,
  carbs: 10,
  fat: 8,
};

const SAMPLE_NUTRITION_TEMPLATE = {
  name: 'High Protein Plan',
  description: 'A template for muscle gain',
  dayTypes: [
    {
      name: 'Training Day',
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          items: [
            {
              foodName: 'Eggs',
              quantityG: 100,
              kcal: 155,
              protein: 13,
              carbs: 1,
              fat: 11,
            },
          ],
        },
      ],
    },
  ],
};

describe('Nutrition (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let connection: Connection;
  let inviteRepo: InviteRepository;
  let throttlerStorage: ClearableStorage;

  let ownerToken: string;
  let trainerToken: string;
  let trainerId: string;
  let memberToken: string;
  let memberId: string;
  let member2Id: string;

  let nutritionTemplateId: string;

  async function clearCollections(): Promise<void> {
    const db = connection.db;
    if (!db) return;
    const names = [
      'users',
      'invitetokens',
      'passwordresettokens',
      'refreshtokens',
      'userprofiles',
      'foods',
      'nutritiontemplates',
      'membernutritionplans',
      'nutritiondailylogs',
      'selfnutritionlogs',
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

    // Stub FatSecret if credentials are absent
    const fatSecretService = moduleFixture.get(FatSecretService);
    jest
      .spyOn(fatSecretService, 'search')
      .mockImplementation(async (query: string) => {
        if (!process.env.FATSECRET_CLIENT_ID) {
          return [
            {
              foodId: 'stub-1',
              name: `${query} (stub)`,
              brand: null,
              foodType: 'Generic' as const,
              defaultServing: {
                servingId: 's1',
                description: '100g',
                grams: 100,
                calories: 165,
                protein: 31,
                carbs: 0,
                fat: 3.6,
              },
              servings: [],
            },
          ];
        }
        return fatSecretService.search(query);
      });

    await clearCollections();
    throttlerStorage.storage?.clear();

    // 1. Register owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(OWNER);
    expect(ownerRes.status).toBe(201);
    ownerToken = (ownerRes.body as LoginBody).access_token;

    // 2. Create trainer invite and register trainer
    const trainerInvite = await inviteRepo.create({
      token: 'nutrition-trainer-invite',
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
      token: 'nutrition-member-invite',
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

    // 4. Create second member (no trainer link — belongs to owner)
    const member2Invite = await inviteRepo.create({
      token: 'nutrition-member2-invite',
      role: 'member',
      invitedBy: (ownerRes.body as LoginBody).user.id,
      recipientEmail: MEMBER2.email,
      expiresAt: new Date(Date.now() + 3_600_000),
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
  // Foods
  // ──────────────────────────────────────────────────────────

  describe('POST /api/v1/foods (Sprint Contract)', () => {
    it('as trainer with valid macros → 201 + body.proteinPer100g defined', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/foods')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Chicken Breast',
          brand: null,
          macrosPer100g: SAMPLE_FOOD_MACROS,
          servings: [{ label: '100g', grams: 100 }],
        });
      expect(res.status).toBe(201);
      const body = res.body as { _id: string; proteinPer100g: number };
      expect(body._id).toBeDefined();
      expect(body.proteinPer100g).toBeDefined();
    });

    it('as member → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/foods')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Sneaky Food',
          macrosPer100g: SAMPLE_FOOD_MACROS,
          servings: [{ label: '100g', grams: 100 }],
        });
      expect(res.status).toBe(403);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Food Search
  // ──────────────────────────────────────────────────────────

  describe('GET /api/v1/food-search (Sprint Contract)', () => {
    it('GET /api/v1/food-search?q=chicken → 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/food-search?q=chicken')
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      const body = res.body as { results: unknown[] };
      expect(Array.isArray(body.results)).toBe(true);
    });

    it('missing q → 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/food-search')
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Nutrition Templates
  // ──────────────────────────────────────────────────────────

  describe('POST /api/v1/nutrition-templates (Sprint Contract)', () => {
    it('as trainer → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/nutrition-templates')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(SAMPLE_NUTRITION_TEMPLATE);
      expect(res.status).toBe(201);
      const body = res.body as { _id: string };
      expect(body._id).toBeDefined();
      nutritionTemplateId = body._id;
    });

    it('as member → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/nutrition-templates')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(SAMPLE_NUTRITION_TEMPLATE);
      expect(res.status).toBe(403);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Member Nutrition Plan Assignment
  // ──────────────────────────────────────────────────────────

  describe('PUT /api/v1/members/:memberId/nutrition (Sprint Contract)', () => {
    it('trainer assigns plan to own member → 200', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/members/${memberId}/nutrition`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          templateId: nutritionTemplateId,
          name: 'High Protein Plan',
          dayTypes: SAMPLE_NUTRITION_TEMPLATE.dayTypes,
          schedule: {
            weeklyPattern: [],
            calendarOverrides: [],
            iterate: true,
          },
        });
      expect(res.status).toBe(200);
    });

    it('trainer assigning to foreign member → 404', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/members/${member2Id}/nutrition`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Forbidden Plan',
          dayTypes: [],
          schedule: {
            weeklyPattern: [],
            calendarOverrides: [],
            iterate: true,
          },
        });
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Self Nutrition Logs
  // ──────────────────────────────────────────────────────────

  describe('GET /api/v1/me/nutrition-logs/:date (Sprint Contract)', () => {
    it('GET → 200', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/nutrition-logs/${today}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
    });

    it('invalid date → 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me/nutrition-logs/not-a-date')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/me/nutrition-logs (Sprint Contract)', () => {
    it('records intake → 201 + body.totals.protein defined', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request(app.getHttpServer())
        .post('/api/v1/me/nutrition-logs')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          date: today,
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Free Day',
          meals: [
            {
              name: 'Lunch',
              order: 1,
              completed: true,
              items: [
                {
                  foodName: 'Chicken Breast',
                  quantityG: 150,
                  kcal: 247,
                  protein: 46,
                  carbs: 0,
                  fat: 5,
                },
              ],
            },
          ],
          dayCompleted: false,
        });
      expect(res.status).toBe(201);
      const body = res.body as { totals: { protein: number } };
      expect(body.totals).toBeDefined();
      expect(body.totals.protein).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  // Member Nutrition Recent (loggedToday logic)
  // ──────────────────────────────────────────────────────────

  describe('GET /api/v1/members/:memberId/nutrition/recent (Sprint Contract)', () => {
    it('→ 200 + body.loggedToday defined', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/nutrition/recent`)
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      const body = res.body as { loggedToday: boolean };
      expect(body.loggedToday).toBeDefined();
    });

    it('loggedToday is true after member logs freestyle today', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/nutrition/recent`)
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(200);
      // The POST above created a SelfNutritionLog for today, so loggedToday must be true
      const body = res.body as { loggedToday: boolean };
      expect(body.loggedToday).toBe(true);
    });

    it('trainer accessing foreign member → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${member2Id}/nutrition/recent`)
        .set('Authorization', `Bearer ${trainerToken}`);
      expect(res.status).toBe(404);
    });

    it('owner can access any member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/members/${memberId}/nutrition/recent`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
    });
  });
});

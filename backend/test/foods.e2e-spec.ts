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
import { FoodsModule } from '../src/modules/foods/foods.module';
import { EmailModule } from '../src/common/email/email.module';
import {
  User,
  UserSchema,
  UserDocument,
} from '../src/common/models/user.model';
import {
  Food,
  FoodSchema,
  FoodDocument,
} from '../src/modules/foods/food.model';
import {
  IEmailService,
  EMAIL_SERVICE,
} from '../src/common/email/email.service';

const OWNER_EMAIL = 'foods-e2e-owner@example.com';
const TRAINER_EMAIL = 'foods-e2e-trainer@example.com';
const MEMBER_EMAIL = 'foods-e2e-member@example.com';
const TEST_PASSWORD = 'Password1';

const validCreateBody = {
  name: 'Brown Rice',
  brand: null,
  macrosPer100g: {
    kcal: 360,
    protein: 7,
    carbs: 77,
    fat: 3,
  },
  servings: [],
};

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
        { name: Food.name, schema: FoodSchema },
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
      FoodsModule,
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

describe('Foods (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let foodModel: Model<FoodDocument>;
  let ownerToken: string;
  let trainerToken: string;
  let memberToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    foodModel = module.get<Model<FoodDocument>>(getModelToken(Food.name));

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const ownerDoc = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Foods',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Foods',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'Foods',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: null,
    });

    // Seed a global food with "Chicken" in the name
    await foodModel.create({
      name: 'Chicken Breast',
      brand: null,
      isGlobal: true,
      createdBy: ownerDoc._id,
      macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 4 },
      servings: [],
    });

    // Seed a non-global food with "Chicken" in name for owner (should appear for owner only)
    await foodModel.create({
      name: 'Chicken Thigh (custom)',
      brand: null,
      isGlobal: false,
      createdBy: ownerDoc._id,
      macrosPer100g: { kcal: 209, protein: 26, carbs: 0, fat: 11 },
      servings: [],
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

  // ─── GET /foods ───────────────────────────────────────────────────────────────

  describe('GET /foods', () => {
    it('trainer q=chick&limit=5 → 200 array of at most 5 foods whose name matches "chick", each with kcal/protein/carbs/fat', async () => {
      const res = await request(app.getHttpServer())
        .get('/foods?q=chick&limit=5')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const foods = res.body as Array<Record<string, unknown>>;
      expect(Array.isArray(foods)).toBe(true);
      expect(foods.length).toBeLessThanOrEqual(5);
      // At least the global "Chicken Breast" should appear
      const names = foods.map((f) => f.name);
      expect(names).toContain('Chicken Breast');
      // Each food should have macros
      for (const food of foods) {
        const macros = food.macrosPer100g as Record<string, unknown>;
        expect(macros).toHaveProperty('kcal');
        expect(macros).toHaveProperty('protein');
        expect(macros).toHaveProperty('carbs');
        expect(macros).toHaveProperty('fat');
      }
      // Trainer's own foods should not include owner's private food
      expect(names).not.toContain('Chicken Thigh (custom)');
    });

    it('owner q=chick → sees global + own private food', async () => {
      const res = await request(app.getHttpServer())
        .get('/foods?q=chick')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const names = (res.body as Array<Record<string, unknown>>).map(
        (f) => f.name,
      );
      expect(names).toContain('Chicken Breast');
      expect(names).toContain('Chicken Thigh (custom)');
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer()).get('/foods').expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .get('/foods')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  // ─── POST /foods ──────────────────────────────────────────────────────────────

  describe('POST /foods', () => {
    it('owner with valid macros → 201 and isGlobal is false', async () => {
      const res = await request(app.getHttpServer())
        .post('/foods')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validCreateBody)
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('_id');
      expect(body).toHaveProperty('name', 'Brown Rice');
      expect(body).toHaveProperty('isGlobal', false);
      const macros = body.macrosPer100g as Record<string, unknown>;
      expect(macros).toHaveProperty('kcal', 360);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .post('/foods')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(validCreateBody)
        .expect(403);
    });

    it('missing macrosPer100g → 400', async () => {
      await request(app.getHttpServer())
        .post('/foods')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'No Macros' })
        .expect(400);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .post('/foods')
        .send(validCreateBody)
        .expect(401);
    });
  });

  // ─── PATCH /foods/:id ────────────────────────────────────────────────────────

  describe('PATCH /foods/:id', () => {
    let ownerFoodId: string;
    let globalFoodId: string;

    beforeAll(async () => {
      // Create a private food owned by the owner
      const createRes = await request(app.getHttpServer())
        .post('/foods')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Owner Private Food',
          brand: null,
          macrosPer100g: { kcal: 100, protein: 10, carbs: 10, fat: 5 },
          servings: [],
        })
        .expect(201);
      ownerFoodId = (createRes.body as Record<string, unknown>)._id as string;

      // Get the global food id seeded in beforeAll
      const searchRes = await request(app.getHttpServer())
        .get('/foods?q=Chicken+Breast')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const globalFood = (
        searchRes.body as Array<Record<string, unknown>>
      ).find((f) => f.isGlobal === true);
      globalFoodId = globalFood!._id as string;
    });

    it('owner on their own food → 200, response reflects the changed name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/foods/${ownerFoodId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Owner Private Food Updated' })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('name', 'Owner Private Food Updated');
    });

    it('owner on a global food → 403', async () => {
      await request(app.getHttpServer())
        .patch(`/foods/${globalFoodId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Attempted Override' })
        .expect(403);
    });

    it("trainer on the owner's private food → 403", async () => {
      await request(app.getHttpServer())
        .patch(`/foods/${ownerFoodId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ name: 'Trainer Override Attempt' })
        .expect(403);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .patch(`/foods/${ownerFoodId}`)
        .send({ name: 'No Auth' })
        .expect(401);
    });

    it('member token → 403', async () => {
      await request(app.getHttpServer())
        .patch(`/foods/${ownerFoodId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Attempt' })
        .expect(403);
    });
  });

  // ─── DELETE /foods/:id ───────────────────────────────────────────────────────

  describe('DELETE /foods/:id', () => {
    let deletableFoodId: string;
    let deletableFoodName: string;
    let globalFoodId: string;

    beforeAll(async () => {
      deletableFoodName = `Delete Target ${Date.now()}`;
      const createRes = await request(app.getHttpServer())
        .post('/foods')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: deletableFoodName,
          brand: null,
          macrosPer100g: { kcal: 50, protein: 5, carbs: 5, fat: 2 },
          servings: [],
        })
        .expect(201);
      deletableFoodId = (createRes.body as Record<string, unknown>)
        ._id as string;

      const searchRes = await request(app.getHttpServer())
        .get('/foods?q=Chicken+Breast')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const globalFood = (
        searchRes.body as Array<Record<string, unknown>>
      ).find((f) => f.isGlobal === true);
      globalFoodId = globalFood!._id as string;
    });

    it('owner on their own food → 204, subsequent GET no longer returns it', async () => {
      await request(app.getHttpServer())
        .delete(`/foods/${deletableFoodId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const searchRes = await request(app.getHttpServer())
        .get(`/foods?q=${encodeURIComponent(deletableFoodName)}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const names = (searchRes.body as Array<Record<string, unknown>>).map(
        (f) => f.name,
      );
      expect(names).not.toContain(deletableFoodName);
    });

    it('owner on a global food → 403', async () => {
      await request(app.getHttpServer())
        .delete(`/foods/${globalFoodId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('no token → 401', async () => {
      await request(app.getHttpServer())
        .delete(`/foods/${globalFoodId}`)
        .expect(401);
    });
  });
});

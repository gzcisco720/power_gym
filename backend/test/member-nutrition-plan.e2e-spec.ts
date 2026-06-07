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
  MemberNutritionPlan,
  MemberNutritionPlanSchema,
  MemberNutritionPlanDocument,
} from '../src/common/models/member-nutrition-plan.model';
import {
  NutritionTemplate,
  NutritionTemplateSchema,
} from '../src/modules/nutrition-templates/nutrition-template.model';

const OWNER_EMAIL = 'mnp-e2e-owner@example.com';
const TRAINER_EMAIL = 'mnp-e2e-trainer@example.com';
const OTHER_TRAINER_EMAIL = 'mnp-e2e-other-trainer@example.com';
const MEMBER_EMAIL = 'mnp-e2e-member@example.com';
const TEST_PASSWORD = 'Password1';

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
        { name: MemberNutritionPlan.name, schema: MemberNutritionPlanSchema },
        { name: NutritionTemplate.name, schema: NutritionTemplateSchema },
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

describe('Member Nutrition Plan (e2e)', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let memberNutritionPlanModel: Model<MemberNutritionPlanDocument>;
  let ownerToken: string;
  let trainerToken: string;
  let otherTrainerToken: string;
  let memberId: string;
  let ownerId: string;
  let trainerId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const mockEmail: IEmailService = { sendPasswordReset: jest.fn() };
    ({ app, module } = await buildApp(uri, mockEmail));

    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    memberNutritionPlanModel = module.get<Model<MemberNutritionPlanDocument>>(
      getModelToken(MemberNutritionPlan.name),
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const owner = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'MNP',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'owner',
      trainerId: null,
    });
    ownerId = owner._id.toString();

    const trainer = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'MNP',
      lastName: 'Trainer',
      email: TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });
    trainerId = trainer._id.toString();

    await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'MNP',
      lastName: 'OtherTrainer',
      email: OTHER_TRAINER_EMAIL,
      passwordHash,
      role: 'trainer',
      trainerId: null,
    });

    const member = await userModel.create({
      _id: new Types.ObjectId(),
      firstName: 'MNP',
      lastName: 'Member',
      email: MEMBER_EMAIL,
      passwordHash,
      role: 'member',
      trainerId: trainer._id,
    });
    memberId = member._id.toString();

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
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── GET /nutrition/members/:memberId/plan ────────────────────────────────────

  describe('GET /nutrition/members/:memberId/plan', () => {
    it('unauthenticated → 401', async () => {
      await request(app.getHttpServer())
        .get(`/nutrition/members/${memberId}/plan`)
        .expect(401);
    });

    it('no active plan → 200 with null body', async () => {
      const res = await request(app.getHttpServer())
        .get(`/nutrition/members/${memberId}/plan`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(res.body).toBeNull();
    });

    it('owning trainer → 200 with dayTypes', async () => {
      // Seed an active plan for the member
      await memberNutritionPlanModel.create({
        memberId: new Types.ObjectId(memberId),
        assignedById: new Types.ObjectId(trainerId),
        templateId: null,
        name: 'MNP Test Plan',
        isActive: true,
        assignedAt: new Date(),
        dayTypes: [sampleDayType],
        schedule: {
          weeklyPattern: [],
          calendarOverrides: [],
          iterate: true,
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/nutrition/members/${memberId}/plan`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      const body = res.body as {
        name: string;
        isActive: boolean;
        dayTypes: { name: string }[];
      };
      expect(body.name).toBe('MNP Test Plan');
      expect(body.isActive).toBe(true);
      expect(Array.isArray(body.dayTypes)).toBe(true);
      expect(body.dayTypes).toHaveLength(1);
      expect(body.dayTypes[0].name).toBe('High Carb');
    });

    it('non-owning trainer → 404', async () => {
      await request(app.getHttpServer())
        .get(`/nutrition/members/${memberId}/plan`)
        .set('Authorization', `Bearer ${otherTrainerToken}`)
        .expect(404);
    });

    it('owner → 200 with dayTypes', async () => {
      const res = await request(app.getHttpServer())
        .get(`/nutrition/members/${memberId}/plan`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as { name: string; dayTypes: { name: string }[] };
      expect(body.dayTypes).toHaveLength(1);
    });
  });
});

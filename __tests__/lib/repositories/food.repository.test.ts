import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
import { FoodModel } from '@/lib/db/models/food.model';

let mongo: MongoMemoryServer;
const repo = new MongoFoodRepository();
const trainerA = new mongoose.Types.ObjectId();
const trainerB = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  await FoodModel.deleteMany({});
});

describe('MongoFoodRepository', () => {
  it('creates and retrieves a food', async () => {
    const f = await repo.create({
      createdBy: trainerA,
      name: 'Coles chicken breast',
      brand: 'Coles',
      macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
      servings: [{ label: '100 g', grams: 100 }],
    });
    expect(f._id).toBeDefined();
    expect(f.brand).toBe('Coles');
  });

  it('persists optional micronutrients', async () => {
    const f = await repo.create({
      createdBy: trainerA,
      name: 'Sardines',
      macrosPer100g: { kcal: 200, protein: 25, carbs: 0, fat: 11, sodium: 400, cholesterol: 80 },
      servings: [{ label: '100 g', grams: 100 }],
    });
    expect(f.macrosPer100g.sodium).toBe(400);
    expect(f.macrosPer100g.cholesterol).toBe(80);
  });

  it('findVisibleTo returns only own foods', async () => {
    await repo.create({
      createdBy: trainerA,
      name: 'A1',
      macrosPer100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 },
      servings: [{ label: '100 g', grams: 100 }],
    });
    await repo.create({
      createdBy: trainerB,
      name: 'B1',
      macrosPer100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 },
      servings: [{ label: '100 g', grams: 100 }],
    });
    const visible = await repo.findVisibleTo(trainerA);
    expect(visible).toHaveLength(1);
    expect(visible[0].name).toBe('A1');
  });

  it('findVisibleTo supports case-insensitive query filter', async () => {
    await repo.create({
      createdBy: trainerA,
      name: 'Apple',
      macrosPer100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 },
      servings: [{ label: '100 g', grams: 100 }],
    });
    await repo.create({
      createdBy: trainerA,
      name: 'Pear',
      macrosPer100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 },
      servings: [{ label: '100 g', grams: 100 }],
    });
    const visible = await repo.findVisibleTo(trainerA, 'app');
    expect(visible).toHaveLength(1);
    expect(visible[0].name).toBe('Apple');
  });

  it('findById returns null for unknown id', async () => {
    const out = await repo.findById(new mongoose.Types.ObjectId());
    expect(out).toBeNull();
  });

  it('updates a food', async () => {
    const f = await repo.create({
      createdBy: trainerA,
      name: 'Old',
      macrosPer100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 },
      servings: [{ label: '100 g', grams: 100 }],
    });
    const updated = await repo.update(f._id, { name: 'New' });
    expect(updated?.name).toBe('New');
  });

  it('deletes a food', async () => {
    const f = await repo.create({
      createdBy: trainerA,
      name: 'Doomed',
      macrosPer100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 },
      servings: [{ label: '100 g', grams: 100 }],
    });
    const ok = await repo.delete(f._id);
    expect(ok).toBe(true);
    expect(await repo.findById(f._id)).toBeNull();
  });
});

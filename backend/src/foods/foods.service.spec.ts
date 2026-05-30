import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FoodsService } from './foods.service';
import type { IFood } from '../database/models/food.model';

function makeFood(overrides: Partial<Record<string, unknown>> = {}): IFood {
  return {
    _id: { toString: () => 'food1' },
    createdBy: {
      toString: () => 'user1',
      equals: (v: unknown) => v?.toString() === 'user1',
    },
    name: 'Chicken Breast',
    brand: null,
    macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    servings: [{ label: '100g', grams: 100 }],
    createdAt: new Date(),
    ...overrides,
  } as unknown as IFood;
}

function makeService(repoOverrides: Record<string, jest.Mock> = {}) {
  const repo = {
    findById: jest.fn().mockResolvedValue(null),
    findVisibleTo: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue(makeFood()),
    update: jest.fn().mockResolvedValue(makeFood()),
    deleteById: jest.fn().mockResolvedValue(true),
    ...repoOverrides,
  };
  const service = new FoodsService(repo as never);
  return { service, repo };
}

describe('FoodsService > create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists food with per-100g macros and createdBy', async () => {
    const created = makeFood({
      _id: { toString: () => 'newFood' },
      createdBy: {
        toString: () => 'requester1',
        equals: (v: unknown) => v?.toString() === 'requester1',
      },
    });
    const createMock = jest.fn().mockResolvedValue(created);
    const { service } = makeService({ create: createMock });

    const result = await service.create(
      {
        name: 'Chicken Breast',
        brand: null,
        macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
        servings: [{ label: '100g', grams: 100 }],
      },
      'requester1',
    );

    expect(createMock).toHaveBeenCalledWith({
      name: 'Chicken Breast',
      brand: null,
      macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
      servings: [{ label: '100g', grams: 100 }],
      createdBy: 'requester1',
    });
    expect(result).toBe(created);
  });
});

describe('FoodsService > list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns requester-visible foods', async () => {
    const foods = [makeFood(), makeFood({ _id: { toString: () => 'food2' } })];
    const findMock = jest.fn().mockResolvedValue(foods);
    const { service } = makeService({ findVisibleTo: findMock });

    const result = await service.list('user1', undefined);

    expect(findMock).toHaveBeenCalledWith('user1', undefined);
    expect(result).toBe(foods);
  });
});

describe('FoodsService > findOne', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the food when found and owned by requester', async () => {
    const food = makeFood();
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(food),
    });

    const result = await service.findOne('food1', 'user1');

    expect(result).toBe(food);
  });

  it('throws NotFoundException when food not found', async () => {
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findOne('bad', 'user1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when requester does not own the food', async () => {
    const food = makeFood({
      createdBy: {
        toString: () => 'other',
        equals: (v: unknown) => v?.toString() === 'other',
      },
    });
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(food),
    });

    await expect(service.findOne('food1', 'user1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('FoodsService > update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects update when requester does not own the food', async () => {
    const food = makeFood({
      createdBy: {
        toString: () => 'other',
        equals: (v: unknown) => v?.toString() === 'other',
      },
    });
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(food),
    });

    await expect(
      service.update('food1', { name: 'Hacked' }, 'user1'),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('FoodsService > remove', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes the food when owned by requester', async () => {
    const food = makeFood();
    const deleteMock = jest.fn().mockResolvedValue(true);
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(food),
      deleteById: deleteMock,
    });

    await service.remove('food1', 'user1');

    expect(deleteMock).toHaveBeenCalledWith('food1', 'user1');
  });

  it('throws NotFoundException when food not found', async () => {
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(null),
    });

    await expect(service.remove('bad', 'user1')).rejects.toThrow(
      NotFoundException,
    );
  });
});

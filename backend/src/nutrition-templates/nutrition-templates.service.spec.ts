import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NutritionTemplatesService } from './nutrition-templates.service';
import type { INutritionTemplate } from '../database/models/nutrition-template.model';

function makeNutritionTemplate(
  overrides: Partial<Record<string, unknown>> = {},
): INutritionTemplate {
  return {
    _id: { toString: () => 'nt1' },
    name: 'Bulk Plan',
    description: null,
    createdBy: { toString: () => 'user1' },
    dayTypes: [],
    createdAt: new Date(),
    ...overrides,
  } as unknown as INutritionTemplate;
}

function makeService(repoOverrides: Record<string, jest.Mock> = {}) {
  const repo = {
    findByCreator: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(makeNutritionTemplate()),
    update: jest.fn().mockResolvedValue(makeNutritionTemplate()),
    deleteById: jest.fn().mockResolvedValue(true),
    ...repoOverrides,
  };
  const service = new NutritionTemplatesService(repo as never);
  return { service, repo };
}

describe('NutritionTemplatesService > create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists dayTypes with meals and computed/echoed macros', async () => {
    const dayTypes = [
      {
        name: 'Training Day',
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [
              {
                foodName: 'Oats',
                quantityG: 100,
                kcal: 389,
                protein: 17,
                carbs: 66,
                fat: 7,
              },
            ],
          },
        ],
      },
    ];

    const createdTemplate = makeNutritionTemplate({
      _id: { toString: () => 'new-nt' },
      name: 'Bulk Plan',
      createdBy: { toString: () => 'requester1' },
      dayTypes,
    });

    const createMock = jest.fn().mockResolvedValue(createdTemplate);
    const { service } = makeService({ create: createMock });

    const result = await service.create(
      { name: 'Bulk Plan', description: null, dayTypes },
      'requester1',
    );

    expect(createMock).toHaveBeenCalledWith({
      name: 'Bulk Plan',
      description: null,
      createdBy: 'requester1',
      dayTypes,
    });
    expect(result).toBe(createdTemplate);
    // macros are stored as provided (no server-side recomputation in v1)
    expect(result.dayTypes[0].meals[0].items[0].protein).toBe(17);
    expect(result.dayTypes[0].meals[0].items[0].carbs).toBe(66);
    expect(result.dayTypes[0].meals[0].items[0].fat).toBe(7);
  });
});

describe('NutritionTemplatesService > findAll', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns templates for the requesting user', async () => {
    const templates = [makeNutritionTemplate()];
    const { service } = makeService({
      findByCreator: jest.fn().mockResolvedValue(templates),
    });

    const result = await service.findAll('user1');

    expect(result).toBe(templates);
  });
});

describe('NutritionTemplatesService > findOne', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns template when found and owned', async () => {
    const template = makeNutritionTemplate();
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
    });

    const result = await service.findOne('nt1', 'user1');

    expect(result).toBe(template);
  });

  it('throws NotFoundException when template not found', async () => {
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findOne('bad-id', 'user1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when requester does not own the template', async () => {
    const template = makeNutritionTemplate({
      createdBy: { toString: () => 'other-user' },
    });
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
    });

    await expect(service.findOne('nt1', 'user1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('NutritionTemplatesService > update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects editing a template not owned by requester (403)', async () => {
    const template = makeNutritionTemplate({
      createdBy: { toString: () => 'other-user' },
    });
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
    });

    await expect(
      service.update('nt1', { name: 'Hacked' }, 'user1'),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('NutritionTemplatesService > remove', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes the template when owned by requester', async () => {
    const template = makeNutritionTemplate();
    const deleteByIdMock = jest.fn().mockResolvedValue(true);
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
      deleteById: deleteByIdMock,
    });

    await service.remove('nt1', 'user1');

    expect(deleteByIdMock).toHaveBeenCalledWith('nt1', 'user1');
  });

  it('404 on unknown id', async () => {
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(null),
    });

    await expect(service.remove('unknown-id', 'user1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when requester does not own the template', async () => {
    const template = makeNutritionTemplate({
      createdBy: { toString: () => 'other-user' },
    });
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
    });

    await expect(service.remove('nt1', 'user1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

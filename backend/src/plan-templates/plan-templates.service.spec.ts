import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlanTemplatesService } from './plan-templates.service';
import type {
  IPlanTemplate,
  IPlanDay,
} from '../database/models/plan-template.model';

function makePlanTemplate(
  overrides: Partial<Record<string, unknown>> = {},
): IPlanTemplate {
  return {
    _id: { toString: () => 'pt1' },
    name: 'Strength Block',
    description: null,
    createdBy: { toString: () => 'user1' },
    days: [],
    createdAt: new Date(),
    ...overrides,
  } as unknown as IPlanTemplate;
}

function makeService(repoOverrides: Record<string, jest.Mock> = {}) {
  const repo = {
    findByCreator: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(makePlanTemplate()),
    update: jest.fn().mockResolvedValue(makePlanTemplate()),
    deleteById: jest.fn().mockResolvedValue(true),
    ...repoOverrides,
  };
  const service = new PlanTemplatesService(repo as never);
  return { service, repo };
}

describe('PlanTemplatesService > create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists template with nested days/exercises and createdBy = requester', async () => {
    const days: IPlanDay[] = [
      {
        dayNumber: 1,
        name: 'Day 1',
        exercises: [
          {
            groupId: 'g1',
            isSuperset: false,
            exerciseId: 'eid1' as never,
            exerciseName: 'Squat',
            imageUrl: null,
            isBodyweight: false,
            sets: 3,
            repsMin: 5,
            repsMax: 8,
            restSeconds: 120,
          },
        ],
      },
    ];
    const createdTemplate = makePlanTemplate({
      _id: { toString: () => 'new-pt' },
      name: 'Push Day',
      createdBy: { toString: () => 'requester1' },
      days,
    });

    const createMock = jest.fn().mockResolvedValue(createdTemplate);
    const { service } = makeService({ create: createMock });

    const result = await service.create(
      { name: 'Push Day', description: null, days },
      'requester1',
    );

    expect(createMock).toHaveBeenCalledWith({
      name: 'Push Day',
      description: null,
      createdBy: 'requester1',
      days,
    });
    expect(result).toBe(createdTemplate);
  });
});

describe('PlanTemplatesService > findAll', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns templates for the requesting user', async () => {
    const templates = [
      makePlanTemplate(),
      makePlanTemplate({ _id: { toString: () => 'pt2' } }),
    ];
    const { service } = makeService({
      findByCreator: jest.fn().mockResolvedValue(templates),
    });

    const result = await service.findAll('user1');

    expect(result).toBe(templates);
  });
});

describe('PlanTemplatesService > findOne', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the template when found and owned by requester', async () => {
    const template = makePlanTemplate();
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
    });

    const result = await service.findOne('pt1', 'user1');

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
    const template = makePlanTemplate({
      createdBy: { toString: () => 'other-user' },
    });
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
    });

    await expect(service.findOne('pt1', 'user1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('PlanTemplatesService > update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates and returns the template when owned by requester', async () => {
    const template = makePlanTemplate();
    const updated = makePlanTemplate({ name: 'Updated Name' });
    const updateMock = jest.fn().mockResolvedValue(updated);
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
      update: updateMock,
    });

    const result = await service.update(
      'pt1',
      { name: 'Updated Name' },
      'user1',
    );

    expect(updateMock).toHaveBeenCalledWith('pt1', { name: 'Updated Name' });
    expect(result).toBe(updated);
  });

  it('rejects editing a template not owned by requester (403)', async () => {
    const template = makePlanTemplate({
      createdBy: { toString: () => 'other-user' },
    });
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
    });

    await expect(
      service.update('pt1', { name: 'Hacked' }, 'user1'),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('PlanTemplatesService > remove', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes the template when owned by requester', async () => {
    const template = makePlanTemplate();
    const deleteByIdMock = jest.fn().mockResolvedValue(true);
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
      deleteById: deleteByIdMock,
    });

    await service.remove('pt1', 'user1');

    expect(deleteByIdMock).toHaveBeenCalledWith('pt1', 'user1');
  });

  it('throws NotFoundException when template not found', async () => {
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(null),
    });

    await expect(service.remove('bad-id', 'user1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when requester does not own the template', async () => {
    const template = makePlanTemplate({
      createdBy: { toString: () => 'other-user' },
    });
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(template),
    });

    await expect(service.remove('pt1', 'user1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

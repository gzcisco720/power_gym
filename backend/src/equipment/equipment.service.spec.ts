import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import type { IEquipment } from '../database/models/equipment.model';
import type { IConditionReport } from '../database/models/condition-report.model';

function makeEquipment(
  overrides: Partial<Record<string, unknown>> = {},
): IEquipment {
  return {
    _id: { toString: () => 'eq1' },
    name: 'Barbell',
    status: 'active',
    brand: null,
    quantity: 1,
    images: [],
    note: null,
    trackCondition: false,
    nextServiceDate: null,
    createdAt: new Date(),
    ...overrides,
  } as unknown as IEquipment;
}

function makeReport(
  overrides: Partial<Record<string, unknown>> = {},
): IConditionReport {
  return {
    _id: { toString: () => 'r1' },
    equipmentId: { toString: () => 'eq1' },
    note: 'Looks worn',
    reportedAt: new Date(),
    ...overrides,
  } as unknown as IConditionReport;
}

function makeService(
  eqOverrides: Record<string, jest.Mock> = {},
  crOverrides: Record<string, jest.Mock> = {},
) {
  const eqRepo = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(makeEquipment()),
    update: jest.fn().mockResolvedValue(makeEquipment()),
    deleteById: jest.fn().mockResolvedValue(undefined),
    ...eqOverrides,
  };
  const crRepo = {
    findByEquipmentId: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue(makeReport()),
    ...crOverrides,
  };
  const service = new EquipmentService(eqRepo as never, crRepo as never);
  return { service, eqRepo, crRepo };
}

describe('EquipmentService > findAll', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns all equipment', async () => {
    const items = [
      makeEquipment(),
      makeEquipment({ _id: { toString: () => 'eq2' } }),
    ];
    const { service } = makeService({
      findAll: jest.fn().mockResolvedValue(items),
    });

    const result = await service.findAll();

    expect(result).toBe(items);
  });
});

describe('EquipmentService > create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates and returns new equipment', async () => {
    const created = makeEquipment({ name: 'Dumbbell' });
    const createMock = jest.fn().mockResolvedValue(created);
    const { service } = makeService({ create: createMock });

    const result = await service.create({ name: 'Dumbbell' });

    expect(createMock).toHaveBeenCalled();
    expect(result).toBe(created);
  });
});

describe('EquipmentService > update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('changes status and validates enum (active/maintenance/retired)', async () => {
    const existing = makeEquipment();
    const updated = makeEquipment({ status: 'maintenance' });
    const updateMock = jest.fn().mockResolvedValue(updated);
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(existing),
      update: updateMock,
    });

    const result = await service.update('eq1', { status: 'maintenance' });

    expect(updateMock).toHaveBeenCalledWith('eq1', { status: 'maintenance' });
    expect(result).toBe(updated);
  });

  it('throws BadRequestException for invalid status enum', async () => {
    const existing = makeEquipment();
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(existing),
    });

    await expect(
      service.update('eq1', { status: 'broken' as 'active' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when equipment not found', async () => {
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(null),
    });

    await expect(service.update('bad', { status: 'active' })).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('EquipmentService > addConditionReport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('appends a report linked to equipmentId', async () => {
    const equipment = makeEquipment();
    const report = makeReport();
    const createMock = jest.fn().mockResolvedValue(report);
    const { service } = makeService(
      { findById: jest.fn().mockResolvedValue(equipment) },
      { create: createMock },
    );

    const result = await service.addConditionReport('eq1', 'Looks worn');

    expect(createMock).toHaveBeenCalledWith({
      equipmentId: 'eq1',
      note: 'Looks worn',
    });
    expect(result).toBe(report);
  });

  it('throws NotFoundException when equipment not found', async () => {
    const { service } = makeService({
      findById: jest.fn().mockResolvedValue(null),
    });

    await expect(service.addConditionReport('bad', 'note')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('EquipmentService > getConditionReports', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns condition reports for the equipment', async () => {
    const equipment = makeEquipment();
    const reports = [
      makeReport(),
      makeReport({ _id: { toString: () => 'r2' } }),
    ];
    const findMock = jest.fn().mockResolvedValue(reports);
    const { service } = makeService(
      { findById: jest.fn().mockResolvedValue(equipment) },
      { findByEquipmentId: findMock },
    );

    const result = await service.getConditionReports('eq1');

    expect(findMock).toHaveBeenCalledWith('eq1');
    expect(result).toBe(reports);
  });
});

import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import type { IEquipment } from '../database/models/equipment.model';
import type { IConditionReport } from '../database/models/condition-report.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEquipment(
  overrides: Partial<Record<string, unknown>> = {},
): IEquipment {
  return {
    _id: 'eq1',
    name: 'Barbell',
    status: 'active',
    brand: null,
    quantity: 1,
    images: [],
    note: null,
    trackCondition: false,
    nextServiceDate: null,
    ...overrides,
  } as unknown as IEquipment;
}

function makeReport(): IConditionReport {
  return {
    _id: 'r1',
    equipmentId: 'eq1',
    note: 'Looks fine',
  } as unknown as IConditionReport;
}

function makeService(
  overrides: {
    equipmentRepo?: Record<string, jest.Mock>;
    conditionReportRepo?: Record<string, jest.Mock>;
  } = {},
) {
  const equipmentRepo = overrides.equipmentRepo ?? {
    create: jest.fn().mockResolvedValue(makeEquipment()),
    findAll: jest.fn().mockResolvedValue([makeEquipment()]),
    findById: jest.fn().mockResolvedValue(makeEquipment()),
  };
  const conditionReportRepo = overrides.conditionReportRepo ?? {
    create: jest.fn().mockResolvedValue(makeReport()),
    findByEquipmentId: jest.fn().mockResolvedValue([makeReport()]),
  };

  const service = new EquipmentService(
    equipmentRepo as never,
    conditionReportRepo as never,
  );

  return { service, equipmentRepo, conditionReportRepo };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────

describe('EquipmentService > create', () => {
  it('throws BadRequestException when name is blank/whitespace', async () => {
    const { service } = makeService();

    await expect(service.create({ name: '   ' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('trims name/brand/note and applies defaults when not provided', async () => {
    const { service, equipmentRepo } = makeService();

    await service.create({
      name: '  Barbell  ',
      brand: '  Rogue  ',
      note: '  Good condition  ',
    });

    expect(equipmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Barbell',
        brand: 'Rogue',
        note: 'Good condition',
        status: 'active',
        quantity: 1,
        images: [],
      }),
    );
  });

  it('parses nextServiceDate into a Date when provided', async () => {
    const { service, equipmentRepo } = makeService();

    await service.create({ name: 'Barbell', nextServiceDate: '2026-12-01' });

    const [firstCall] = equipmentRepo.create.mock.calls as [
      Record<string, unknown>[],
    ];
    const call = firstCall[0];
    expect(call.nextServiceDate).toBeInstanceOf(Date);
    expect((call.nextServiceDate as Date).toISOString()).toContain(
      '2026-12-01',
    );
  });

  it('sets nextServiceDate to null when not provided', async () => {
    const { service, equipmentRepo } = makeService();

    await service.create({ name: 'Barbell' });

    expect(equipmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ nextServiceDate: null }),
    );
  });
});

// ── addConditionReport ────────────────────────────────────────────────────────

describe('EquipmentService > addConditionReport', () => {
  it('throws NotFoundException when the equipment does not exist', async () => {
    const { service } = makeService({
      equipmentRepo: {
        create: jest.fn(),
        findAll: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.addConditionReport('eq1', { note: 'cracked' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates a report linked to the equipmentId on success', async () => {
    const { service, conditionReportRepo } = makeService();

    await service.addConditionReport('eq1', { note: 'needs servicing' });

    expect(conditionReportRepo.create).toHaveBeenCalledWith({
      equipmentId: 'eq1',
      note: 'needs servicing',
    });
  });
});

// ── listConditionReports ──────────────────────────────────────────────────────

describe('EquipmentService > listConditionReports', () => {
  it('delegates to conditionReportRepo.findByEquipmentId', async () => {
    const { service, conditionReportRepo } = makeService();

    const result = await service.listConditionReports('eq1');

    expect(conditionReportRepo.findByEquipmentId).toHaveBeenCalledWith('eq1');
    expect(result).toEqual([makeReport()]);
  });
});

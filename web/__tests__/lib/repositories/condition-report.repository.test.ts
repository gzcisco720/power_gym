/** @jest-environment node */

jest.mock('@/lib/db/models/condition-report.model', () => ({
  ConditionReportModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    create: jest.fn(),
  }),
}));

import mongoose from 'mongoose';
import { ConditionReportModel } from '@/lib/db/models/condition-report.model';
import { MongoConditionReportRepository } from '@/lib/repositories/condition-report.repository';

const mockReportModel = jest.mocked(ConditionReportModel);

const EQUIP_ID = '507f1f77bcf86cd799439011';

describe('MongoConditionReportRepository', () => {
  let repo: MongoConditionReportRepository;

  beforeEach(() => {
    repo = new MongoConditionReportRepository();
    jest.clearAllMocks();
  });

  it('findByEquipmentId returns reports sorted newest first', async () => {
    const reports = [
      { _id: 'r1', equipmentId: EQUIP_ID, note: 'Belt worn', reportedAt: new Date() },
    ];
    mockReportModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(reports) } as never);
    const result = await repo.findByEquipmentId(EQUIP_ID);
    expect(mockReportModel.find).toHaveBeenCalledWith({ equipmentId: expect.any(mongoose.Types.ObjectId) });
    expect(result).toEqual(reports);
  });

  it('create saves report with note only', async () => {
    const saved = { _id: 'r1', equipmentId: EQUIP_ID, note: 'Routine inspection', reportedAt: new Date() };
    mockReportModel.create.mockResolvedValue(saved as never);

    const result = await repo.create({ equipmentId: EQUIP_ID, note: 'Routine inspection' });

    expect(mockReportModel.create).toHaveBeenCalledWith({
      equipmentId: expect.any(mongoose.Types.ObjectId),
      note: 'Routine inspection',
    });
    expect(result).toEqual(saved);
  });

  it('create does not touch equipment status', async () => {
    const saved = { _id: 'r2', equipmentId: EQUIP_ID, note: 'Check complete', reportedAt: new Date() };
    mockReportModel.create.mockResolvedValue(saved as never);

    await repo.create({ equipmentId: EQUIP_ID, note: 'Check complete' });

    // No Equipment model interaction — status is updated via separate PATCH
    expect(mockReportModel.create).toHaveBeenCalledTimes(1);
  });
});

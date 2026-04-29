/** @jest-environment node */

jest.mock('@/lib/db/models/equipment.model', () => ({
  EquipmentModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  }),
}));

import { EquipmentModel } from '@/lib/db/models/equipment.model';
import { MongoEquipmentRepository } from '@/lib/repositories/equipment.repository';

const mockEquipmentModel = jest.mocked(EquipmentModel);

const EQUIP_ID = '507f1f77bcf86cd799439011';

describe('MongoEquipmentRepository', () => {
  let repo: MongoEquipmentRepository;

  beforeEach(() => {
    repo = new MongoEquipmentRepository();
    jest.clearAllMocks();
  });

  it('findAll returns all equipment sorted by name', async () => {
    const items = [{ _id: EQUIP_ID, name: 'Smith Machine' }];
    mockEquipmentModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(items) } as never);
    const result = await repo.findAll();
    expect(mockEquipmentModel.find).toHaveBeenCalledWith({});
    expect(result).toEqual(items);
  });

  it('findById returns equipment when found', async () => {
    const item = { _id: EQUIP_ID, name: 'Barbell' };
    mockEquipmentModel.findById.mockResolvedValue(item as never);
    const result = await repo.findById(EQUIP_ID);
    expect(result).toEqual(item);
  });

  it('findById returns null when not found', async () => {
    mockEquipmentModel.findById.mockResolvedValue(null);
    const result = await repo.findById(EQUIP_ID);
    expect(result).toBeNull();
  });

  it('create saves and returns new equipment', async () => {
    const saved = { _id: EQUIP_ID, name: 'Treadmill', category: 'cardio', quantity: 3, status: 'active', purchasedAt: null, notes: null };
    const saveMock = jest.fn().mockResolvedValue(saved);
    (EquipmentModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));
    const result = await repo.create({ name: 'Treadmill', category: 'cardio', quantity: 3, status: 'active', purchasedAt: null, notes: null });
    expect(result).toEqual(saved);
  });

  it('update calls findByIdAndUpdate and returns updated doc', async () => {
    const updated = { _id: EQUIP_ID, name: 'Barbell', status: 'maintenance' };
    mockEquipmentModel.findByIdAndUpdate.mockResolvedValue(updated as never);
    const result = await repo.update(EQUIP_ID, { status: 'maintenance' });
    expect(mockEquipmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
      EQUIP_ID,
      { $set: { status: 'maintenance' } },
      { new: true },
    );
    expect(result).toEqual(updated);
  });

  it('deleteById calls findByIdAndDelete', async () => {
    mockEquipmentModel.findByIdAndDelete.mockResolvedValue(null);
    await repo.deleteById(EQUIP_ID);
    expect(mockEquipmentModel.findByIdAndDelete).toHaveBeenCalledWith(EQUIP_ID);
  });
});

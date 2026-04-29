/** @jest-environment node */

jest.mock('@/lib/db/models/equipment.model', () => {
  const ctor = jest.fn();
  ctor.find = jest.fn();
  ctor.findById = jest.fn();
  ctor.findByIdAndUpdate = jest.fn();
  ctor.findByIdAndDelete = jest.fn();
  ctor.prototype.save = jest.fn();
  return { EquipmentModel: ctor };
});

import { EquipmentModel } from '@/lib/db/models/equipment.model';
import { MongoEquipmentRepository } from '@/lib/repositories/equipment.repository';

const mockFind = jest.mocked(EquipmentModel.find);
const mockFindById = jest.mocked(EquipmentModel.findById);
const mockFindByIdAndUpdate = jest.mocked(EquipmentModel.findByIdAndUpdate);
const mockFindByIdAndDelete = jest.mocked(EquipmentModel.findByIdAndDelete);

const EQUIP_ID = '507f1f77bcf86cd799439011';

describe('MongoEquipmentRepository', () => {
  const repo = new MongoEquipmentRepository();

  beforeEach(() => jest.clearAllMocks());

  it('findAll returns all equipment sorted by name', async () => {
    const items = [{ _id: EQUIP_ID, name: 'Smith Machine' }];
    mockFind.mockReturnValue({ sort: jest.fn().mockResolvedValue(items) } as never);
    const result = await repo.findAll();
    expect(mockFind).toHaveBeenCalledWith({});
    expect(result).toEqual(items);
  });

  it('findById returns equipment when found', async () => {
    const item = { _id: EQUIP_ID, name: 'Barbell' };
    mockFindById.mockResolvedValue(item as never);
    const result = await repo.findById(EQUIP_ID);
    expect(result).toEqual(item);
  });

  it('findById returns null when not found', async () => {
    mockFindById.mockResolvedValue(null);
    const result = await repo.findById(EQUIP_ID);
    expect(result).toBeNull();
  });

  it('create saves and returns new equipment', async () => {
    const saved = { _id: EQUIP_ID, name: 'Treadmill', category: 'cardio', quantity: 3, status: 'active', purchasedAt: null, notes: null };
    jest.spyOn(EquipmentModel.prototype, 'save').mockResolvedValue(saved as never);
    const result = await repo.create({ name: 'Treadmill', category: 'cardio', quantity: 3, status: 'active', purchasedAt: null, notes: null });
    expect(result).toEqual(saved);
  });

  it('update calls findByIdAndUpdate and returns updated doc', async () => {
    const updated = { _id: EQUIP_ID, name: 'Barbell', status: 'maintenance' };
    mockFindByIdAndUpdate.mockResolvedValue(updated as never);
    const result = await repo.update(EQUIP_ID, { status: 'maintenance' });
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      EQUIP_ID,
      { $set: { status: 'maintenance' } },
      { new: true },
    );
    expect(result).toEqual(updated);
  });

  it('deleteById calls findByIdAndDelete', async () => {
    mockFindByIdAndDelete.mockResolvedValue(null);
    await repo.deleteById(EQUIP_ID);
    expect(mockFindByIdAndDelete).toHaveBeenCalledWith(EQUIP_ID);
  });
});

import mongoose from 'mongoose';
import { MongoServiceTypeRepository } from '@/lib/repositories/service-type.repository';
import { ServiceTypeModel } from '@/lib/db/models/service-type.model';

jest.mock('@/lib/db/models/service-type.model', () => ({
  ServiceTypeModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(ServiceTypeModel);

describe('MongoServiceTypeRepository', () => {
  let repo: MongoServiceTypeRepository;
  const ownerId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    repo = new MongoServiceTypeRepository();
    jest.clearAllMocks();
  });

  it('findAll returns all service types sorted by name', async () => {
    const types = [
      { _id: 'st1', name: '1小时私教' },
      { _id: 'st2', name: '2小时私教' },
    ];
    mockModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(types) } as never);
    const result = await repo.findAll();
    expect(mockModel.find).toHaveBeenCalledWith({});
    expect(result).toEqual(types);
  });

  it('findActive returns only isActive:true types sorted by name', async () => {
    const types = [{ _id: 'st1', name: '1小时私教', isActive: true }];
    mockModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(types) } as never);
    const result = await repo.findActive();
    expect(mockModel.find).toHaveBeenCalledWith({ isActive: true });
    expect(result).toEqual(types);
  });

  it('findById delegates to model', async () => {
    const type = { _id: 'st1', name: '1小时私教' };
    mockModel.findById.mockResolvedValue(type as never);
    const result = await repo.findById('st1');
    expect(mockModel.findById).toHaveBeenCalledWith('st1');
    expect(result).toEqual(type);
  });

  it('create saves a new service type', async () => {
    const saved = {
      _id: 'st1',
      name: '1小时私教',
      durationMin: 60,
      pricePerSession: 300,
      currency: 'CNY',
      isActive: true,
      createdBy: ownerId,
    };
    const saveMock = jest.fn().mockResolvedValue(saved);
    (ServiceTypeModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

    const result = await repo.create({
      name: '1小时私教',
      durationMin: 60,
      pricePerSession: 300,
      currency: 'CNY',
      createdBy: ownerId,
    });

    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });

  it('update calls findByIdAndUpdate with $set', async () => {
    const updated = { _id: 'st1', pricePerSession: 350 };
    mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);
    const result = await repo.update('st1', { pricePerSession: 350 });
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('st1', { $set: { pricePerSession: 350 } }, { new: true });
    expect(result).toEqual(updated);
  });

  it('deactivate sets isActive:false', async () => {
    const deactivated = { _id: 'st1', isActive: false };
    mockModel.findByIdAndUpdate.mockResolvedValue(deactivated as never);
    const result = await repo.deactivate('st1');
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('st1', { $set: { isActive: false } }, { new: true });
    expect(result).toEqual(deactivated);
  });
});

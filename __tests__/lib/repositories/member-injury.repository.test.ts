import mongoose from 'mongoose';

jest.mock('@/lib/db/models/member-injury.model', () => {
  const save = jest.fn();
  const MockModel = Object.assign(
    jest.fn().mockImplementation(() => ({ save })),
    {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    },
  );
  return { MemberInjuryModel: MockModel };
});

import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MemberInjuryModel } from '@/lib/db/models/member-injury.model';

const mockModel = MemberInjuryModel as jest.MockedClass<typeof MemberInjuryModel>;

describe('MongoMemberInjuryRepository', () => {
  let repo: MongoMemberInjuryRepository;
  const memberId = new mongoose.Types.ObjectId().toString();
  const injuryId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoMemberInjuryRepository();
  });

  it('findByMember calls find with memberId and sorts by recordedAt desc', async () => {
    const fakeSortFn = jest.fn().mockResolvedValue([]);
    (mockModel.find as jest.Mock).mockReturnValue({ sort: fakeSortFn });

    await repo.findByMember(memberId);

    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: expect.any(mongoose.Types.ObjectId) }),
    );
    expect(fakeSortFn).toHaveBeenCalledWith({ recordedAt: -1 });
  });

  it('findActiveByMember filters by status active', async () => {
    const fakeSortFn = jest.fn().mockResolvedValue([]);
    (mockModel.find as jest.Mock).mockReturnValue({ sort: fakeSortFn });

    await repo.findActiveByMember(memberId);

    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: expect.any(mongoose.Types.ObjectId), status: 'active' }),
    );
    expect(fakeSortFn).toHaveBeenCalledWith({ recordedAt: -1 });
  });

  it('findById returns single record', async () => {
    const injury = { _id: injuryId, title: 'Knee strain' };
    (mockModel.findById as jest.Mock).mockResolvedValue(injury);

    const result = await repo.findById(injuryId);

    expect(mockModel.findById).toHaveBeenCalledWith(injuryId);
    expect(result).toEqual(injury);
  });

  it('create saves and returns new injury', async () => {
    const saved = { _id: injuryId, title: 'Knee strain' };
    const saveMock = jest.fn().mockResolvedValue(saved);
    mockModel.mockImplementation(() => ({ save: saveMock }) as never);

    const result = await repo.create({ memberId, title: 'Knee strain' });

    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });

  it('update calls findByIdAndUpdate with $set and returns updated', async () => {
    const updated = { _id: injuryId, status: 'resolved' as const };
    (mockModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(updated);

    const result = await repo.update(injuryId, { status: 'resolved' });

    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
      injuryId,
      { $set: { status: 'resolved' } },
      { new: true },
    );
    expect(result).toEqual(updated);
  });

  it('deleteById calls findByIdAndDelete', async () => {
    (mockModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

    await repo.deleteById(injuryId);

    expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(injuryId);
  });
});

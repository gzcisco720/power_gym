/** @jest-environment node */
import mongoose from 'mongoose';

jest.mock('@/lib/db/models/member-medication.model', () => {
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
  return { MemberMedicationModel: MockModel };
});

import { MongoMemberMedicationRepository } from '@/lib/repositories/member-medication.repository';
import { MemberMedicationModel } from '@/lib/db/models/member-medication.model';

const mockModel = MemberMedicationModel as jest.MockedClass<typeof MemberMedicationModel>;

describe('MongoMemberMedicationRepository', () => {
  let repo: MongoMemberMedicationRepository;
  const memberId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoMemberMedicationRepository();
  });

  it('findByMember calls find with memberId and sorts', async () => {
    const fakeSortFn = jest.fn().mockResolvedValue([]);
    (mockModel.find as jest.Mock).mockReturnValue({ sort: fakeSortFn });
    await repo.findByMember(memberId);
    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: expect.any(mongoose.Types.ObjectId) }),
    );
    expect(fakeSortFn).toHaveBeenCalledWith({ status: 1, startDate: -1 });
  });

  it('create saves a new document with ObjectId memberId', async () => {
    const instance = { save: jest.fn().mockResolvedValue({ _id: 'med1' }) };
    (mockModel as jest.Mock).mockImplementation(() => instance);
    await repo.create({
      memberId,
      name: 'Ibuprofen',
      purpose: 'Pain',
      duration: 'short_term',
      startDate: new Date(),
    });
    expect(instance.save).toHaveBeenCalled();
  });

  it('deleteById calls findByIdAndDelete', async () => {
    (mockModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);
    await repo.deleteById('med1');
    expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('med1');
  });
});

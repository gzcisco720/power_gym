/** @jest-environment node */
import mongoose from 'mongoose';

jest.mock('@/lib/db/models/member-medical-history.model', () => ({
  MemberMedicalHistoryModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

import { MongoMemberMedicalHistoryRepository } from '@/lib/repositories/member-medical-history.repository';
import { MemberMedicalHistoryModel } from '@/lib/db/models/member-medical-history.model';

const mockModel = MemberMedicalHistoryModel as jest.Mocked<typeof MemberMedicalHistoryModel>;

describe('MongoMemberMedicalHistoryRepository', () => {
  const memberId = new mongoose.Types.ObjectId().toString();
  let repo: MongoMemberMedicalHistoryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoMemberMedicalHistoryRepository();
  });

  it('findByMember calls findOne with memberId', async () => {
    (mockModel.findOne as jest.Mock).mockResolvedValue(null);
    await repo.findByMember(memberId);
    expect(mockModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: expect.any(mongoose.Types.ObjectId) }),
    );
  });

  it('upsert calls findOneAndUpdate with upsert:true', async () => {
    (mockModel.findOneAndUpdate as jest.Mock).mockResolvedValue({ memberId, chronicConditions: [] });
    await repo.upsert(memberId, { surgeries: 'None' });
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: expect.any(mongoose.Types.ObjectId) }),
      expect.objectContaining({ $set: { surgeries: 'None' } }),
      expect.objectContaining({ upsert: true }),
    );
  });
});

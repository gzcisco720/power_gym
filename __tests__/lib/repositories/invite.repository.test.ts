import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { InviteTokenModel } from '@/lib/db/models/invite-token.model';

jest.mock('@/lib/db/models/invite-token.model', () => ({
  InviteTokenModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(InviteTokenModel);

describe('MongoInviteRepository', () => {
  let repo: MongoInviteRepository;

  beforeEach(() => {
    repo = new MongoInviteRepository();
    jest.clearAllMocks();
  });

  describe('findByToken', () => {
    it('returns invite when found', async () => {
      const mockInvite = { token: 'abc', role: 'member' };
      mockModel.findOne.mockResolvedValue(mockInvite as never);

      const result = await repo.findByToken('abc');

      expect(mockModel.findOne).toHaveBeenCalledWith({ token: 'abc' });
      expect(result).toEqual(mockInvite);
    });

    it('returns null when not found', async () => {
      mockModel.findOne.mockResolvedValue(null as never);

      const result = await repo.findByToken('missing');

      expect(result).toBeNull();
    });
  });

  describe('markUsed', () => {
    it('sets usedAt on the token', async () => {
      mockModel.findOneAndUpdate.mockResolvedValue({} as never);

      await repo.markUsed('abc');

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { token: 'abc' },
        { $set: { usedAt: expect.any(Date) } },
      );
    });
  });

  describe('create', () => {
    it('saves and returns a new invite token', async () => {
      const saveMock = jest.fn().mockResolvedValue({ token: 'uuid' });
      mockModel.mockImplementation(() => ({ save: saveMock }) as never);

      await repo.create({
        token: 'uuid',
        role: 'member',
        invitedBy: 'inviter-id',
        recipientEmail: 'user@test.com',
        expiresAt: new Date(),
      });

      expect(saveMock).toHaveBeenCalled();
    });
  });
});

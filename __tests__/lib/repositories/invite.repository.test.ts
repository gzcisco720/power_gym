/** @jest-environment node */
jest.mock('@/lib/db/models/invite-token.model', () => ({
  InviteTokenModel: Object.assign(
    jest.fn(),
    {
      findOne: jest.fn(),
      find: jest.fn(),
      findOneAndDelete: jest.fn(),
      findOneAndUpdate: jest.fn(),
    },
  ),
}));

import type { IInviteToken } from '@/lib/db/models/invite-token.model';
import { InviteTokenModel } from '@/lib/db/models/invite-token.model';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';

const mockModel = jest.mocked(InviteTokenModel);
const mockFind = jest.mocked(InviteTokenModel.find);
const mockFindOneAndDelete = jest.mocked(InviteTokenModel.findOneAndDelete);
const mockFindOneAndUpdate = jest.mocked(InviteTokenModel.findOneAndUpdate);

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
      mockFindOneAndUpdate.mockResolvedValue({} as never);

      await repo.markUsed('abc');

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
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

describe('MongoInviteRepository extensions', () => {
  const repo = new MongoInviteRepository();

  beforeEach(() => jest.clearAllMocks());

  it('findAll calls find with no filter and sorts by expiresAt desc', async () => {
    const invites = [{ token: 'abc' }];
    const sortMock = jest.fn().mockResolvedValue(invites);
    mockFind.mockReturnValue({ sort: sortMock } as never);

    const result = await repo.findAll();

    expect(mockFind).toHaveBeenCalledWith({});
    expect(sortMock).toHaveBeenCalledWith({ expiresAt: -1 });
    expect(result).toEqual(invites);
  });

  it('revoke deletes the invite by id', async () => {
    mockFindOneAndDelete.mockResolvedValue({ token: 'abc' } as never);

    await repo.revoke('invite-id-123');

    expect(mockFindOneAndDelete).toHaveBeenCalledWith({ _id: 'invite-id-123' });
  });

  it('regenerate updates token and expiresAt and clears usedAt', async () => {
    const updated = { token: 'new-token', expiresAt: new Date(), usedAt: null } as unknown as IInviteToken;
    mockFindOneAndUpdate.mockResolvedValue(updated as never);

    const result = await repo.regenerate('invite-id-123');

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'invite-id-123' },
      expect.objectContaining({
        $set: expect.objectContaining({ usedAt: null }),
      }),
      { new: true },
    );
    expect(result).toEqual(updated);
  });

  it('regenerate throws when invite not found', async () => {
    mockFindOneAndUpdate.mockResolvedValue(null as never);

    await expect(repo.regenerate('missing-id')).rejects.toThrow('Invite missing-id not found');
  });
});

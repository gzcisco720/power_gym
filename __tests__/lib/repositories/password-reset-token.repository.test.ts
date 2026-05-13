/** @jest-environment node */
jest.mock('@/lib/db/models/password-reset-token.model', () => ({
  PasswordResetTokenModel: Object.assign(
    jest.fn(),
    {
      create: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    },
  ),
}));

import { PasswordResetTokenModel } from '@/lib/db/models/password-reset-token.model';
import type { IPasswordResetToken } from '@/lib/db/models/password-reset-token.model';
import { MongoPasswordResetTokenRepository } from '@/lib/repositories/password-reset-token.repository';

const mockCreate = jest.mocked(PasswordResetTokenModel.create);
const mockFindOne = jest.mocked(PasswordResetTokenModel.findOne);
const mockFindByIdAndUpdate = jest.mocked(PasswordResetTokenModel.findByIdAndUpdate);

describe('MongoPasswordResetTokenRepository', () => {
  let repo: MongoPasswordResetTokenRepository;

  beforeEach(() => {
    repo = new MongoPasswordResetTokenRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a token document with userId as ObjectId, tokenHash, and expiresAt', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const tokenHash = 'hashvalue';
      const expiresAt = new Date(Date.now() + 3600000);
      const mockToken = { userId, tokenHash, expiresAt, usedAt: null } as unknown as IPasswordResetToken;

      mockCreate.mockResolvedValue(mockToken as never);

      const result = await repo.create(userId, tokenHash, expiresAt);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash, expiresAt }),
      );
      expect(result).toEqual(mockToken);
    });
  });

  describe('findByTokenHash', () => {
    it('returns the token when found by hash', async () => {
      const mockToken = { tokenHash: 'abc', usedAt: null } as unknown as IPasswordResetToken;
      mockFindOne.mockResolvedValue(mockToken as never);

      const result = await repo.findByTokenHash('abc');

      expect(mockFindOne).toHaveBeenCalledWith({ tokenHash: 'abc' });
      expect(result).toEqual(mockToken);
    });

    it('returns null when no token matches the hash', async () => {
      mockFindOne.mockResolvedValue(null as never);

      const result = await repo.findByTokenHash('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findValidByUserId', () => {
    it('queries for unused, non-expired tokens and sorts by expiresAt descending', async () => {
      const mockToken = { usedAt: null, expiresAt: new Date(Date.now() + 3600000) } as unknown as IPasswordResetToken;
      const sortMock = jest.fn().mockResolvedValue(mockToken);
      mockFindOne.mockReturnValue({ sort: sortMock } as never);

      const userId = '507f1f77bcf86cd799439011';
      const result = await repo.findValidByUserId(userId);

      expect(mockFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          usedAt: null,
          expiresAt: { $gt: expect.any(Date) },
        }),
      );
      expect(sortMock).toHaveBeenCalledWith({ expiresAt: -1 });
      expect(result).toEqual(mockToken);
    });

    it('returns null when no valid token exists for the user', async () => {
      const sortMock = jest.fn().mockResolvedValue(null);
      mockFindOne.mockReturnValue({ sort: sortMock } as never);

      const result = await repo.findValidByUserId('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });
  });

  describe('markUsed', () => {
    it('sets usedAt to the current date on the specified token', async () => {
      mockFindByIdAndUpdate.mockResolvedValue({} as never);

      await repo.markUsed('507f1f77bcf86cd799439011');

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { $set: { usedAt: expect.any(Date) } },
      );
    });
  });
});

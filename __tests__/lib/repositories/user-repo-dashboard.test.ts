/**
 * @jest-environment node
 */
import { MongoUserRepository } from '@/lib/repositories/user.repository';

jest.mock('@/lib/db/models/user.model', () => ({
  UserModel: { aggregate: jest.fn() },
}));

import { UserModel } from '@/lib/db/models/user.model';

describe('MongoUserRepository.findMembersJoinedByMonth', () => {
  it('returns 6-element array with label and newCount', async () => {
    (UserModel.aggregate as jest.Mock).mockResolvedValue([
      { _id: { year: 2026, month: 5 }, count: 3 },
    ]);
    const repo = new MongoUserRepository();
    const result = await repo.findMembersJoinedByMonth(6);
    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({ label: expect.any(String), newCount: expect.any(Number) });
  });

  it('returns 0 newCount for months with no members', async () => {
    (UserModel.aggregate as jest.Mock).mockResolvedValue([]);
    const repo = new MongoUserRepository();
    const result = await repo.findMembersJoinedByMonth(3);
    expect(result).toHaveLength(3);
    result.forEach(r => expect(r.newCount).toBe(0));
  });
});

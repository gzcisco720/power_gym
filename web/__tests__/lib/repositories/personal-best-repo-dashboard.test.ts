/**
 * @jest-environment node
 */
jest.mock('@/lib/db/models/personal-best.model', () => ({
  PersonalBestModel: { find: jest.fn() },
}));
jest.mock('@/lib/db/models/scheduled-session.model', () => ({
  ScheduledSessionModel: { find: jest.fn() },
}));

import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { PersonalBestModel } from '@/lib/db/models/personal-best.model';
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';

describe('PersonalBestRepository.findByMemberIdsSince', () => {
  it('queries with memberIds array and since date', async () => {
    (PersonalBestModel.find as jest.Mock).mockReturnValue({ sort: () => ({ lean: () => Promise.resolve([]) }) });
    const repo = new MongoPersonalBestRepository();
    const result = await repo.findByMemberIdsSince(['507f1f77bcf86cd799439011'], new Date());
    expect(result).toEqual([]);
    expect(PersonalBestModel.find).toHaveBeenCalled();
  });
});

describe('ScheduledSessionRepository.findUpcomingByMember', () => {
  it('returns limited future sessions for member', async () => {
    (ScheduledSessionModel.find as jest.Mock).mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) });
    const repo = new MongoScheduledSessionRepository();
    const result = await repo.findUpcomingByMember('507f1f77bcf86cd799439011', 3);
    expect(result).toEqual([]);
  });
});

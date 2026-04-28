/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockRepo = {
  findCompletedDates: jest.fn(),
  findTrainedExercises: jest.fn(),
};

jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('MemberProgressPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.findCompletedDates.mockResolvedValue([]);
    mockRepo.findTrainedExercises.mockResolvedValue([]);
  });

  it('returns null when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { default: Page } = await import('@/app/(dashboard)/member/progress/page');
    const result = await Page();
    expect(result).toBeNull();
  });

  it('calls findCompletedDates and findTrainedExercises for the member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { default: Page } = await import('@/app/(dashboard)/member/progress/page');
    await Page();
    expect(mockRepo.findCompletedDates).toHaveBeenCalledWith('m1', expect.any(Date));
    expect(mockRepo.findTrainedExercises).toHaveBeenCalledWith('m1');
  });

  it('uses a since date approximately 90 days in the past', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const now = Date.now();
    const { default: Page } = await import('@/app/(dashboard)/member/progress/page');
    await Page();
    const since = mockRepo.findCompletedDates.mock.calls[0][1] as Date;
    const diffDays = Math.round((now - since.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });
});

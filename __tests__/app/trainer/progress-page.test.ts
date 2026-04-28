/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockWorkoutRepo = {
  findCompletedDates: jest.fn(),
  findTrainedExercises: jest.fn(),
};

const mockUserRepo = { findById: jest.fn() };

jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockWorkoutRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('TrainerMemberProgressPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkoutRepo.findCompletedDates.mockResolvedValue([]);
    mockWorkoutRepo.findTrainedExercises.mockResolvedValue([]);
  });

  it('returns null when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { default: Page } = await import('@/app/(dashboard)/trainer/members/[id]/progress/page');
    const result = await Page(makeParams('m1'));
    expect(result).toBeNull();
  });

  it('returns null when member not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { default: Page } = await import('@/app/(dashboard)/trainer/members/[id]/progress/page');
    const result = await Page(makeParams('m1'));
    expect(result).toBeNull();
  });

  it('returns null when member belongs to a different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Test Member',
      trainerId: { toString: () => 't2' },
    });
    const { default: Page } = await import('@/app/(dashboard)/trainer/members/[id]/progress/page');
    const result = await Page(makeParams('m1'));
    expect(result).toBeNull();
  });

  it('calls findCompletedDates and findTrainedExercises with the member id', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Test Member',
      trainerId: { toString: () => 't1' },
    });
    const { default: Page } = await import('@/app/(dashboard)/trainer/members/[id]/progress/page');
    await Page(makeParams('m1'));
    expect(mockWorkoutRepo.findCompletedDates).toHaveBeenCalledWith('m1', expect.any(Date));
    expect(mockWorkoutRepo.findTrainedExercises).toHaveBeenCalledWith('m1');
  });
});

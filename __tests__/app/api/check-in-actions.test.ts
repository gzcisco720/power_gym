/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockConfigRepo = { upsert: jest.fn() };
jest.mock('@/lib/repositories/check-in-config.repository', () => ({
  MongoCheckInConfigRepository: jest.fn(() => mockConfigRepo),
}));

const mockCheckInRepo = { create: jest.fn() };
jest.mock('@/lib/repositories/check-in.repository', () => ({
  MongoCheckInRepository: jest.fn(() => mockCheckInRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

const mockEmailService = { sendCheckInReceived: jest.fn() };
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn(() => mockEmailService) }));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('upsertCheckInConfigAction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { upsertCheckInConfigAction } = await import(
      '@/app/(dashboard)/trainer/members/[id]/check-ins/actions'
    );
    const result = await upsertCheckInConfigAction('m1', { dayOfWeek: 1, hour: 9, minute: 0, active: true });
    expect(result.error).toBeTruthy();
  });

  it('upserts config and returns no error on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockConfigRepo.upsert.mockResolvedValue({});
    const { upsertCheckInConfigAction } = await import(
      '@/app/(dashboard)/trainer/members/[id]/check-ins/actions'
    );
    const result = await upsertCheckInConfigAction('m1', { dayOfWeek: 1, hour: 9, minute: 0, active: true });
    expect(result.error).toBe('');
    expect(mockConfigRepo.upsert).toHaveBeenCalledWith('m1', 't1', expect.objectContaining({ dayOfWeek: 1 }));
  });
});

describe('getCheckInSignatureAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { getCheckInSignatureAction } = await import(
      '@/app/(dashboard)/member/check-in/actions'
    );
    const result = await getCheckInSignatureAction();
    expect(result.error).toBeTruthy();
  });

  it('returns signature params for authenticated member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { getCheckInSignatureAction } = await import(
      '@/app/(dashboard)/member/check-in/actions'
    );
    const result = await getCheckInSignatureAction();
    expect(result.error).toBe('');
    expect(result.signature).toBeTruthy();
    expect(result.timestamp).toBeGreaterThan(0);
    expect(result.cloudName).toBe('test-cloud');
    expect(result.apiKey).toBe('test-key');
  });
});

describe('createCheckInAction', () => {
  const validData = {
    sleepQuality: 7, stress: 4, fatigue: 5, hunger: 6,
    recovery: 8, energy: 7, digestion: 8,
    weight: 75, waist: null, steps: null, exerciseMinutes: null,
    walkRunDistance: null, sleepHours: 7.5,
    dietDetails: 'Good', stuckToDiet: 'yes' as const,
    wellbeing: 'Feeling good', notes: '', photos: [],
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { createCheckInAction } = await import(
      '@/app/(dashboard)/member/check-in/actions'
    );
    const result = await createCheckInAction(validData);
    expect(result.error).toBeTruthy();
  });

  it('creates check-in and sends email to trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 't1' } } as never);
    mockCheckInRepo.create.mockResolvedValue({ _id: 'ci1' });
    mockUserRepo.findById.mockResolvedValue({ name: 'Coach Bob', email: 'bob@gym.com' });
    const { createCheckInAction } = await import(
      '@/app/(dashboard)/member/check-in/actions'
    );
    const result = await createCheckInAction(validData);
    expect(result.error).toBe('');
    expect(mockCheckInRepo.create).toHaveBeenCalledWith(expect.objectContaining({ memberId: 'm1' }));
    expect(mockEmailService.sendCheckInReceived).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'bob@gym.com' }),
    );
  });

  it('returns no error when trainer is not found (email silently skipped)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: null } } as never);
    mockCheckInRepo.create.mockResolvedValue({ _id: 'ci1' });
    const { createCheckInAction } = await import(
      '@/app/(dashboard)/member/check-in/actions'
    );
    const result = await createCheckInAction(validData);
    expect(result.error).toBe('');
    expect(mockEmailService.sendCheckInReceived).not.toHaveBeenCalled();
  });
});

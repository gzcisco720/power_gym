/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

// redirect() in Next.js throws at runtime — mirror that so code after redirect() stops
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { auth } from '@/lib/auth/auth';

const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('MemberHubLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    await expect(Layout({ children: null, ...makeParams('m1') })).rejects.toThrow(
      'REDIRECT:/login',
    );
  });

  it('redirects trainer when member belongs to another trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      trainerId: { toString: () => 't2' },
    });
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    await expect(Layout({ children: null, ...makeParams('m1') })).rejects.toThrow(
      'REDIRECT:/trainer/members',
    );
  });

  it('redirects when member not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    await expect(Layout({ children: null, ...makeParams('m1') })).rejects.toThrow(
      'REDIRECT:/trainer/members',
    );
  });

  it('renders for trainer when member belongs to them', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      trainerId: { toString: () => 't1' },
    });
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    const result = await Layout({ children: null, ...makeParams('m1') });
    expect(result).not.toBeNull();
  });

  it('renders for owner regardless of trainerId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      trainerId: { toString: () => 't99' },
    });
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    const result = await Layout({ children: null, ...makeParams('m1') });
    expect(result).not.toBeNull();
  });
});

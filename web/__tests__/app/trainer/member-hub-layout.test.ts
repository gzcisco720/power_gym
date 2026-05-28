/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockAuthFn = jest.fn();
jest.mock('@/lib/auth/auth', () => ({ auth: mockAuthFn }));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

const mockPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockPlanRepo),
}));

// redirect() in Next.js throws at runtime — mirror that so code after redirect() stops
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const mockAuth = mockAuthFn;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('MemberHubLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date('2026-01-01'),
      trainerId: { toString: () => 't1' },
    });
    mockPlanRepo.findActive.mockResolvedValue(null);
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
    mockPlanRepo.findActive.mockResolvedValue(null);
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
    mockPlanRepo.findActive.mockResolvedValue(null);
    mockUserRepo.findById.mockResolvedValue(null);
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    await expect(Layout({ children: null, ...makeParams('m1') })).rejects.toThrow(
      'REDIRECT:/trainer/members',
    );
  });

  it('renders for trainer when member belongs to them', async () => {
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

  it('renders Log Workout link when member has an active plan', async () => {
    mockPlanRepo.findActive.mockResolvedValue({ _id: 'plan1', isActive: true });
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    const result = await Layout({ children: null, ...makeParams('m1') });
    const html = JSON.stringify(result);
    expect(html).toContain('Log Workout');
  });

  it('does not render Log Workout link when member has no active plan', async () => {
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    const result = await Layout({ children: null, ...makeParams('m1') });
    const html = JSON.stringify(result);
    expect(html).not.toContain('Log Workout');
  });

  it('renders trainer back link for trainer role', async () => {
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    const result = await Layout({ children: null, ...makeParams('m1') });
    const html = JSON.stringify(result);
    expect(html).toContain('/trainer/members');
    expect(html).toContain('Members');
  });

  it('renders owner back link for owner role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date('2026-01-01'),
      trainerId: { toString: () => 't99' },
    });
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    const result = await Layout({ children: null, ...makeParams('m1') });
    const html = JSON.stringify(result);
    expect(html).toContain('/owner/members');
    expect(html).toContain('All Members');
  });
});

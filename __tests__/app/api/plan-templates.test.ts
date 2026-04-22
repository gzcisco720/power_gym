/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockTemplateRepo = { findByCreator: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(() => mockTemplateRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/plan-templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/plan-templates/route');
    const res = await GET(new Request('http://localhost/api/plan-templates'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member calls', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/plan-templates/route');
    const res = await GET(new Request('http://localhost/api/plan-templates'));
    expect(res.status).toBe(403);
  });

  it('returns templates for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const templates = [{ name: 'PPL' }];
    mockTemplateRepo.findByCreator.mockResolvedValue(templates);

    const { GET } = await import('@/app/api/plan-templates/route');
    const res = await GET(new Request('http://localhost/api/plan-templates'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockTemplateRepo.findByCreator).toHaveBeenCalledWith('t1');
    expect(data).toEqual(templates);
  });
});

describe('POST /api/plan-templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates template for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const created = { _id: 'tpl1', name: 'Push Pull Legs' };
    mockTemplateRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/plan-templates/route');
    const res = await POST(new Request('http://localhost/api/plan-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Push Pull Legs', description: null, days: [] }),
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockTemplateRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Push Pull Legs',
      createdBy: 't1',
    }));
  });
});

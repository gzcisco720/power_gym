/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockTemplateRepo = { findByCreator: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/nutrition-template.repository', () => ({
  MongoNutritionTemplateRepository: jest.fn(() => mockTemplateRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/nutrition-templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/nutrition-templates/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 when member calls', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/nutrition-templates/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns templates for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const templates = [{ _id: 't1', name: '减脂计划' }];
    mockTemplateRepo.findByCreator.mockResolvedValue(templates);

    const { GET } = await import('@/app/api/nutrition-templates/route');
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockTemplateRepo.findByCreator).toHaveBeenCalledWith('t1');
    expect(data).toEqual(templates);
  });
});

describe('POST /api/nutrition-templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member calls', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/nutrition-templates/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    }));
    expect(res.status).toBe(403);
  });

  it('creates template and returns 201', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const created = { _id: 'tpl1', name: '增肌计划' };
    mockTemplateRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/nutrition-templates/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '增肌计划', description: null, dayTypes: [] }),
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockTemplateRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: '增肌计划',
      createdBy: 't1',
    }));
  });
});

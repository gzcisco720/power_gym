/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockTemplateRepo = {
  findById: jest.fn(),
  update: jest.fn(),
  deleteById: jest.fn(),
};
jest.mock('@/lib/repositories/nutrition-template.repository', () => ({
  MongoNutritionTemplateRepository: jest.fn(() => mockTemplateRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/nutrition-templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when template not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue(null);

    const { GET } = await import('@/app/api/nutrition-templates/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('tpl1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer accesses another trainer template', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', createdBy: { toString: () => 't2' } });

    const { GET } = await import('@/app/api/nutrition-templates/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('tpl1'));
    expect(res.status).toBe(403);
  });

  it('returns template when authorized', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const template = { _id: 'tpl1', createdBy: { toString: () => 't1' }, name: '减脂计划' };
    mockTemplateRepo.findById.mockResolvedValue(template);

    const { GET } = await import('@/app/api/nutrition-templates/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('tpl1'));
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/nutrition-templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns updated template', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', createdBy: { toString: () => 't1' } });
    const updated = { _id: 'tpl1', name: '新名称' };
    mockTemplateRepo.update.mockResolvedValue(updated);

    const { PUT } = await import('@/app/api/nutrition-templates/[id]/route');
    const res = await PUT(
      new Request('http://localhost/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '新名称' }),
      }),
      makeParams('tpl1'),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(updated);
  });
});

describe('DELETE /api/nutrition-templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 204 on successful delete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', createdBy: { toString: () => 't1' } });
    mockTemplateRepo.deleteById.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/nutrition-templates/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('tpl1'));
    expect(res.status).toBe(204);
  });
});

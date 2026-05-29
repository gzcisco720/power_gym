import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

import { request } from '@/api/client';
import {
  fetchPlanTemplates,
  createPlanTemplate,
  updatePlanTemplate,
  deletePlanTemplate,
  fetchMemberPlan,
  assignPlan,
  startSession,
  fetchSessions,
  getSession,
  updateSet,
  completeSession,
  fetchPbs,
} from '@/api/training';

const mockRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
});

describe('api/training', () => {
  it('fetchPlanTemplates calls GET /api/v1/plan-templates', async () => {
    await fetchPlanTemplates();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/plan-templates');
  });

  it('createPlanTemplate calls POST /api/v1/plan-templates', async () => {
    await createPlanTemplate({ name: 'Plan A' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/plan-templates',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('updatePlanTemplate calls PATCH /api/v1/plan-templates/:id', async () => {
    await updatePlanTemplate('p1', { name: 'Updated' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/plan-templates/p1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('deletePlanTemplate calls DELETE /api/v1/plan-templates/:id', async () => {
    await deletePlanTemplate('p1');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/plan-templates/p1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('fetchMemberPlan calls GET /api/v1/members/:memberId/plan', async () => {
    await fetchMemberPlan('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/members/m1/plan');
  });

  it('assignPlan calls POST /api/v1/members/:memberId/plan', async () => {
    await assignPlan('m1', 'pt1');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/members/m1/plan',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('startSession calls POST /api/v1/sessions', async () => {
    await startSession('m1', 1);
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/sessions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetchSessions calls GET /api/v1/sessions?memberId=', async () => {
    await fetchSessions('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/sessions?memberId=m1');
  });

  it('getSession calls GET /api/v1/sessions/:id', async () => {
    await getSession('s1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/sessions/s1');
  });

  it('updateSet calls PATCH /api/v1/sessions/:id/sets/:setIndex', async () => {
    await updateSet('s1', 0, { weight: 100 });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/sessions/s1/sets/0',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('completeSession calls POST /api/v1/sessions/:id/complete', async () => {
    await completeSession('s1');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/sessions/s1/complete',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetchPbs calls GET /api/v1/members/:memberId/pbs', async () => {
    await fetchPbs('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/members/m1/pbs');
  });
});

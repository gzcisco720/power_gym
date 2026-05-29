import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/body-tests', () => ({
  fetchBodyTests: vi.fn(),
  createBodyTest: vi.fn(),
  deleteBodyTest: vi.fn(),
  exportBodyTestsCsv: vi.fn(),
}));

import * as bodyTestsApi from '@/api/body-tests';
import { useBodyTestsStore } from '@/stores/bodyTestsStore';

const mockTest: bodyTestsApi.BodyTest = {
  _id: 'bt1',
  memberId: 'm1',
  protocol: '3site',
  weight: 75,
  chest: 10,
  abdominal: 20,
  thigh: 15,
  bodyFatPct: 18.5,
  leanMassKg: 61.1,
  fatMassKg: 13.9,
  date: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  useBodyTestsStore.setState({
    testsByMember: {},
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe('bodyTestsStore', () => {
  describe('fetchTests', () => {
    it('populates tests for a member id', async () => {
      vi.mocked(bodyTestsApi.fetchBodyTests).mockResolvedValueOnce([mockTest]);

      await useBodyTestsStore.getState().fetchTests('m1');

      expect(useBodyTestsStore.getState().testsByMember['m1']).toEqual([mockTest]);
    });
  });

  describe('createTest', () => {
    it('appends a test and exposes the computed body-fat result', async () => {
      useBodyTestsStore.setState({ testsByMember: { m1: [] } });
      vi.mocked(bodyTestsApi.createBodyTest).mockResolvedValueOnce(mockTest);

      await useBodyTestsStore.getState().createTest('m1', {
        protocol: '3site',
        weight: 75,
        chest: 10,
        abdominal: 20,
        thigh: 15,
      });

      const tests = useBodyTestsStore.getState().testsByMember['m1'];
      expect(tests).toHaveLength(1);
      expect(tests[0].bodyFatPct).toBe(18.5);
    });
  });

  describe('exportCsv', () => {
    it('requests the export endpoint and returns the url', () => {
      vi.mocked(bodyTestsApi.exportBodyTestsCsv).mockReturnValueOnce('/api/v1/members/m1/body-tests/export');

      const url = useBodyTestsStore.getState().exportCsv('m1');

      expect(url).toBe('/api/v1/members/m1/body-tests/export');
      expect(bodyTestsApi.exportBodyTestsCsv).toHaveBeenCalledWith('m1');
    });
  });
});

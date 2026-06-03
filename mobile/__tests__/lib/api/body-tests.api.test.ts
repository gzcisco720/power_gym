import { apiClient } from '../../../src/lib/api/client';
import {
  fetchMyBodyTests,
  createBodyTest,
  deleteBodyTest,
} from '../../../src/lib/api/body-tests.api';
import { BodyTest, CreateBodyTestDto } from '../../../src/types/body-tests';

jest.mock('../../../src/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as {
  get: jest.MockedFunction<typeof apiClient.get>;
  post: jest.MockedFunction<typeof apiClient.post>;
  delete: jest.MockedFunction<typeof apiClient.delete>;
};

const sampleBodyTest: BodyTest = {
  _id: 'bt-1',
  memberId: 'member-1',
  trainerId: null,
  date: '2026-06-03',
  age: 30,
  sex: 'male',
  weight: 80,
  protocol: '3site',
  chest: 10,
  abdominal: 20,
  thigh: 15,
  tricep: null,
  subscapular: null,
  suprailiac: null,
  midaxillary: null,
  bicep: null,
  lumbar: null,
  bodyFatPct: 16.2,
  fatMassKg: 12.96,
  leanMassKg: 67.04,
  targetWeight: null,
  targetBodyFatPct: null,
  createdAt: '2026-06-03T10:00:00.000Z',
};

const sampleDto: CreateBodyTestDto = {
  date: '2026-06-03',
  age: 30,
  sex: 'male',
  weight: 80,
  protocol: '3site',
  chest: 10,
  abdominal: 20,
  thigh: 15,
};

describe('bodyTestsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchMyBodyTests', () => {
    it('GETs /body-tests/me and returns response.data', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [sampleBodyTest] });

      const result = await fetchMyBodyTests();

      expect(mockApiClient.get).toHaveBeenCalledWith('/body-tests/me');
      expect(result).toEqual([sampleBodyTest]);
    });
  });

  describe('createBodyTest', () => {
    it('POSTs dto to /body-tests and returns the created BodyTest', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: sampleBodyTest });

      const result = await createBodyTest(sampleDto);

      expect(mockApiClient.post).toHaveBeenCalledWith('/body-tests', sampleDto);
      expect(result).toEqual(sampleBodyTest);
    });
  });

  describe('deleteBodyTest', () => {
    it('DELETEs /body-tests/:id and returns void', async () => {
      mockApiClient.delete.mockResolvedValueOnce({ data: undefined });

      const result = await deleteBodyTest('bt-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/body-tests/bt-1');
      expect(result).toBeUndefined();
    });
  });
});

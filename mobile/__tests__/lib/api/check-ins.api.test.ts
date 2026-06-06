import { apiClient } from '../../../src/lib/api/client';
import { fetchCheckIns, createCheckIn, getCheckInUploadSignature, fetchMemberCheckIn } from '../../../src/lib/api/check-ins.api';
import { CheckIn, CreateCheckInDto } from '../../../src/types/check-ins';
import { UploadConfig } from '../../../src/types/equipment';

jest.mock('../../../src/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApiClient = apiClient as {
  get: jest.MockedFunction<typeof apiClient.get>;
  post: jest.MockedFunction<typeof apiClient.post>;
};

const sampleCheckIn: CheckIn = {
  _id: 'ci-1',
  memberId: 'member-1',
  trainerId: 'trainer-1',
  submittedAt: '2026-06-02T10:00:00.000Z',
  sleepQuality: 7,
  stress: 5,
  fatigue: 4,
  hunger: 6,
  recovery: 8,
  energy: 7,
  digestion: 6,
  weight: 80,
  waist: null,
  steps: null,
  exerciseMinutes: null,
  walkRunDistance: null,
  sleepHours: null,
  stuckToDiet: 'yes',
  dietDetails: null,
  wellbeing: null,
  notes: null,
  photos: [],
  createdAt: '2026-06-02T10:00:00.000Z',
};

const sampleDto: CreateCheckInDto = {
  sleepQuality: 7,
  stress: 5,
  fatigue: 4,
  hunger: 6,
  recovery: 8,
  energy: 7,
  digestion: 6,
  stuckToDiet: 'yes',
};

describe('checkInsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchCheckIns', () => {
    it('calls GET /check-ins and returns response.data', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [sampleCheckIn] });

      const result = await fetchCheckIns();

      expect(mockApiClient.get).toHaveBeenCalledWith('/check-ins');
      expect(result).toEqual([sampleCheckIn]);
    });
  });

  describe('createCheckIn', () => {
    it('calls POST /check-ins with the dto and returns response.data', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: sampleCheckIn });

      const result = await createCheckIn(sampleDto);

      expect(mockApiClient.post).toHaveBeenCalledWith('/check-ins', sampleDto);
      expect(result).toEqual(sampleCheckIn);
    });
  });

  describe('getCheckInUploadSignature', () => {
    it('calls the upload-signature endpoint and returns response.data', async () => {
      const uploadConfig: UploadConfig = {
        provider: 'local',
        uploadUrl: 'http://localhost:3001/upload',
        folder: 'check-ins',
      };
      mockApiClient.post.mockResolvedValueOnce({ data: uploadConfig });

      const result = await getCheckInUploadSignature();

      expect(mockApiClient.post).toHaveBeenCalledWith('/check-ins/upload-signature');
      expect(result).toEqual(uploadConfig);
    });
  });

  describe('fetchMemberCheckIn', () => {
    it('requests GET /check-ins/members/:memberId/:id and returns the check-in', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: sampleCheckIn });

      const result = await fetchMemberCheckIn('member-1', 'ci-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/check-ins/members/member-1/ci-1');
      expect(result).toEqual(sampleCheckIn);
    });
  });
});

jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

import { apiClient } from './client';
import { fetchMySessions } from './scheduled-sessions.api';
import { ScheduledSession } from '../../types/scheduled-sessions';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const MOCK_SESSION: ScheduledSession = {
  _id: 'sess1',
  date: '2026-06-10T00:00:00.000Z',
  startTime: '09:00',
  endTime: '10:00',
  status: 'scheduled',
  trainerName: 'John Doe',
  serviceTypeName: 'Personal Training',
  isRecurring: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchMySessions', () => {
  it("calls apiClient.get('/scheduled-sessions/my') and returns response.data", async () => {
    mockGet.mockResolvedValueOnce({ data: [MOCK_SESSION] });

    const result = await fetchMySessions();

    expect(mockGet).toHaveBeenCalledWith('/scheduled-sessions/my');
    expect(result).toEqual([MOCK_SESSION]);
  });

  it('returns an empty array when the server returns an empty array', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    const result = await fetchMySessions();

    expect(result).toEqual([]);
  });
});

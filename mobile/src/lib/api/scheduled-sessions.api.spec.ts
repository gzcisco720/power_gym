jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from './client';
import {
  fetchMySessions,
  fetchStaffSessions,
  createSession,
  updateSession,
  deleteSession,
} from './scheduled-sessions.api';
import { ScheduledSession, StaffSession, CreateSessionInput, UpdateSessionInput } from '../../types/scheduled-sessions';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;
const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

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

const MOCK_STAFF_SESSION: StaffSession = {
  _id: 'sess2',
  date: '2026-06-10T00:00:00.000Z',
  startTime: '09:00',
  endTime: '10:00',
  status: 'scheduled',
  trainerId: 'trainer1',
  trainerName: 'John Doe',
  memberIds: ['member1'],
  memberNames: ['Alice'],
  serviceTypeId: 'st1',
  serviceTypeName: 'Personal Training',
  customServiceName: null,
  seriesId: null,
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

describe('calendarApi', () => {
  describe('fetchStaffSessions', () => {
    it('requests /scheduled-sessions with range query and returns parsed array', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_STAFF_SESSION] });

      const result = await fetchStaffSessions('upcoming');

      expect(mockGet).toHaveBeenCalledWith('/scheduled-sessions', {
        params: { range: 'upcoming' },
      });
      expect(result).toEqual([MOCK_STAFF_SESSION]);
    });

    it('passes range=past when requested', async () => {
      mockGet.mockResolvedValueOnce({ data: [] });

      await fetchStaffSessions('past');

      expect(mockGet).toHaveBeenCalledWith('/scheduled-sessions', {
        params: { range: 'past' },
      });
    });
  });

  describe('createSession', () => {
    it('POSTs body and returns created session', async () => {
      const dto: CreateSessionInput = {
        date: '2026-06-20',
        startTime: '10:00',
        endTime: '11:00',
        memberIds: ['member1'],
      };
      mockPost.mockResolvedValueOnce({ data: MOCK_STAFF_SESSION });

      const result = await createSession(dto);

      expect(mockPost).toHaveBeenCalledWith('/scheduled-sessions', dto);
      expect(result).toEqual(MOCK_STAFF_SESSION);
    });
  });

  describe('updateSession', () => {
    it('PATCHes /scheduled-sessions/:id with dto and returns updated session', async () => {
      const dto: UpdateSessionInput = { startTime: '11:00', scope: 'single' };
      const updated = { ...MOCK_STAFF_SESSION, startTime: '11:00' };
      mockPatch.mockResolvedValueOnce({ data: updated });

      const result = await updateSession('sess2', dto);

      expect(mockPatch).toHaveBeenCalledWith('/scheduled-sessions/sess2', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteSession', () => {
    it('DELETEs /scheduled-sessions/:id with scope query', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined });

      await deleteSession('sess2', 'single');

      expect(mockDelete).toHaveBeenCalledWith('/scheduled-sessions/sess2', {
        params: { scope: 'single' },
      });
    });

    it('passes scope=series for series deletes', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined });

      await deleteSession('sess2', 'series');

      expect(mockDelete).toHaveBeenCalledWith('/scheduled-sessions/sess2', {
        params: { scope: 'series' },
      });
    });
  });
});

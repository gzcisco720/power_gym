jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

import { apiClient } from './client';
import {
  fetchMembers,
  fetchMemberOverview,
  fetchMemberBodyTests,
  fetchMemberInjuries,
  fetchMemberMedications,
} from './members.api';
import { Member, MemberOverview } from '../../types/members';
import { BodyTest } from '../../types/body-tests';
import { Injury, Medication } from '../../types/health';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const MOCK_MEMBERS: Member[] = [
  { id: 'mem1', name: 'Alice Smith', email: 'alice@example.com', trainerId: 'trainer1', trainerName: 'Bob Trainer' },
];

const MOCK_OVERVIEW: MemberOverview = {
  joinedAt: '2024-01-01T00:00:00.000Z',
  lastBodyTestDate: '2024-06-01T00:00:00.000Z',
  lastCheckinDate: null,
};

const MOCK_BODY_TESTS: BodyTest[] = [
  {
    _id: 'bt1',
    memberId: 'mem1',
    trainerId: null,
    date: '2024-06-01T00:00:00.000Z',
    age: 30,
    sex: 'female',
    weight: 65,
    protocol: '3site',
    tricep: 12,
    chest: null,
    subscapular: null,
    abdominal: null,
    suprailiac: null,
    thigh: null,
    midaxillary: null,
    bicep: null,
    lumbar: null,
    bodyFatPct: 22,
    leanMassKg: 50.7,
    fatMassKg: 14.3,
    targetWeight: null,
    targetBodyFatPct: null,
    createdAt: '2024-06-01T00:00:00.000Z',
  },
];

const MOCK_INJURIES: Injury[] = [
  {
    _id: 'inj1',
    memberId: 'mem1',
    title: 'Left knee strain',
    status: 'active',
    recordedAt: '2024-01-01T00:00:00.000Z',
    trainerNotes: null,
    memberNotes: null,
    affectedMovements: null,
    injuryType: null,
    bodyPart: null,
    bodySide: null,
    painAtRest: null,
    painDuringExercise: null,
    mechanism: null,
    aggravatingFactors: null,
    relievingFactors: null,
    seenDoctor: false,
    doctorRestrictions: null,
    rehabilitationStatus: null,
    resolvedAt: null,
    createdByRole: 'trainer',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

const MOCK_MEDICATIONS: Medication[] = [
  {
    _id: 'med1',
    memberId: 'mem1',
    name: 'Ibuprofen',
    purpose: 'Pain relief',
    duration: 'short_term',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: null,
    notes: null,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('members.api', () => {
  describe('fetchMembers', () => {
    it('calls GET /members and returns the typed Member[]', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_MEMBERS });

      const result = await fetchMembers();

      expect(mockGet).toHaveBeenCalledWith('/members');
      expect(result).toEqual(MOCK_MEMBERS);
    });
  });

  describe('fetchMemberDetail helpers', () => {
    it('fetchMemberOverview calls GET /members/:id/overview with the correct id', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_OVERVIEW });

      const result = await fetchMemberOverview('mem1');

      expect(mockGet).toHaveBeenCalledWith('/members/mem1/overview');
      expect(result).toEqual(MOCK_OVERVIEW);
    });

    it('fetchMemberBodyTests calls GET /members/:id/body-tests with the correct id', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_BODY_TESTS });

      const result = await fetchMemberBodyTests('mem1');

      expect(mockGet).toHaveBeenCalledWith('/members/mem1/body-tests');
      expect(result).toEqual(MOCK_BODY_TESTS);
    });

    it('fetchMemberInjuries calls GET /members/:id/injuries with the correct id', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_INJURIES });

      const result = await fetchMemberInjuries('mem1');

      expect(mockGet).toHaveBeenCalledWith('/members/mem1/injuries');
      expect(result).toEqual(MOCK_INJURIES);
    });

    it('fetchMemberMedications calls GET /members/:id/medications with the correct id', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_MEDICATIONS });

      const result = await fetchMemberMedications('mem1');

      expect(mockGet).toHaveBeenCalledWith('/members/mem1/medications');
      expect(result).toEqual(MOCK_MEDICATIONS);
    });
  });
});

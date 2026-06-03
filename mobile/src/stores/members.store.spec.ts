jest.mock('../lib/api/members.api', () => ({
  fetchMembers: jest.fn(),
  fetchMemberOverview: jest.fn(),
  fetchMemberBodyTests: jest.fn(),
  fetchMemberInjuries: jest.fn(),
  fetchMemberMedications: jest.fn(),
}));

import * as membersApi from '../lib/api/members.api';
import { useMembersStore } from './members.store';
import { Member, MemberOverview } from '../types/members';
import { BodyTest } from '../types/body-tests';
import { Injury, Medication } from '../types/health';

const mockFetchMembers = membersApi.fetchMembers as jest.MockedFunction<typeof membersApi.fetchMembers>;
const mockFetchMemberOverview = membersApi.fetchMemberOverview as jest.MockedFunction<typeof membersApi.fetchMemberOverview>;
const mockFetchMemberBodyTests = membersApi.fetchMemberBodyTests as jest.MockedFunction<typeof membersApi.fetchMemberBodyTests>;
const mockFetchMemberInjuries = membersApi.fetchMemberInjuries as jest.MockedFunction<typeof membersApi.fetchMemberInjuries>;
const mockFetchMemberMedications = membersApi.fetchMemberMedications as jest.MockedFunction<typeof membersApi.fetchMemberMedications>;

const MOCK_MEMBER_1: Member = {
  id: 'mem1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  trainerId: 'trainer1',
  trainerName: 'Bob Trainer',
};

const MOCK_MEMBER_2: Member = {
  id: 'mem2',
  name: 'Charlie Jones',
  email: 'charlie@example.com',
  trainerId: null,
  trainerName: null,
};

const MOCK_OVERVIEW: MemberOverview = {
  joinedAt: '2024-01-01T00:00:00.000Z',
  lastBodyTestDate: '2024-06-01T00:00:00.000Z',
  lastCheckinDate: '2024-06-02T00:00:00.000Z',
};

const MOCK_BODY_TEST: BodyTest = {
  _id: 'bt1',
  memberId: 'mem1',
  trainerId: 'trainer1',
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
};

const MOCK_INJURY: Injury = {
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
};

const MOCK_MEDICATION: Medication = {
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
};

function resetStore() {
  useMembersStore.setState({
    members: [],
    loading: false,
    error: null,
    selectedMembers: {},
    detailLoading: false,
    detailError: null,
    searchQuery: '',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useMembersStore', () => {
  describe('fetchMembers', () => {
    it('populates members and sets loading false on success', async () => {
      mockFetchMembers.mockResolvedValueOnce([MOCK_MEMBER_1, MOCK_MEMBER_2]);

      await useMembersStore.getState().fetchMembers();

      const state = useMembersStore.getState();
      expect(state.members).toEqual([MOCK_MEMBER_1, MOCK_MEMBER_2]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error message and loading false when the api rejects', async () => {
      mockFetchMembers.mockRejectedValueOnce(new Error('Network error'));

      await useMembersStore.getState().fetchMembers();

      const state = useMembersStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
      expect(state.members).toEqual([]);
    });
  });

  describe('fetchMemberDetail', () => {
    it('populates overview, bodyTests, injuries, and medications for the given member id on success', async () => {
      mockFetchMemberOverview.mockResolvedValueOnce(MOCK_OVERVIEW);
      mockFetchMemberBodyTests.mockResolvedValueOnce([MOCK_BODY_TEST]);
      mockFetchMemberInjuries.mockResolvedValueOnce([MOCK_INJURY]);
      mockFetchMemberMedications.mockResolvedValueOnce([MOCK_MEDICATION]);

      await useMembersStore.getState().fetchMemberDetail('mem1');

      const state = useMembersStore.getState();
      expect(state.selectedMembers['mem1']).toEqual({
        overview: MOCK_OVERVIEW,
        bodyTests: [MOCK_BODY_TEST],
        injuries: [MOCK_INJURY],
        medications: [MOCK_MEDICATION],
      });
      expect(state.detailLoading).toBe(false);
      expect(state.detailError).toBeNull();
    });

    it('sets detailError and detailLoading false when the api rejects', async () => {
      mockFetchMemberOverview.mockRejectedValueOnce(new Error('Server error'));
      mockFetchMemberBodyTests.mockResolvedValueOnce([]);
      mockFetchMemberInjuries.mockResolvedValueOnce([]);
      mockFetchMemberMedications.mockResolvedValueOnce([]);

      await useMembersStore.getState().fetchMemberDetail('mem1');

      const state = useMembersStore.getState();
      expect(state.detailLoading).toBe(false);
      expect(state.detailError).toBe('Server error');
    });
  });

  describe('filteredMembers', () => {
    it('returns only members whose name matches the search query case-insensitively', () => {
      useMembersStore.setState({ members: [MOCK_MEMBER_1, MOCK_MEMBER_2], searchQuery: 'alice' });

      const state = useMembersStore.getState();
      const filtered = state.filteredMembers();
      expect(filtered).toEqual([MOCK_MEMBER_1]);
    });

    it('returns all members when the search query is empty', () => {
      useMembersStore.setState({ members: [MOCK_MEMBER_1, MOCK_MEMBER_2], searchQuery: '' });

      const state = useMembersStore.getState();
      const filtered = state.filteredMembers();
      expect(filtered).toEqual([MOCK_MEMBER_1, MOCK_MEMBER_2]);
    });
  });
});

/**
 * Stage 5 unit test — membersStore.fetchMemberDetail stores overviewStats
 */

jest.mock('../lib/api/members.api', () => ({
  fetchMembers: jest.fn(),
  fetchMemberOverview: jest.fn(),
  fetchMemberBodyTests: jest.fn(),
  fetchMemberInjuries: jest.fn(),
  fetchMemberMedications: jest.fn(),
  fetchMemberCheckIns: jest.fn(),
  fetchMemberOverviewStats: jest.fn(),
}));

import * as membersApi from '../lib/api/members.api';
import { useMembersStore } from './members.store';
import { MemberOverview, MemberOverviewStats } from '../types/members';
import { BodyTest } from '../types/body-tests';
import { Injury, Medication } from '../types/health';
import { CheckIn } from '../types/check-ins';

const mockFetchMemberOverview = membersApi.fetchMemberOverview as jest.MockedFunction<
  typeof membersApi.fetchMemberOverview
>;
const mockFetchMemberBodyTests = membersApi.fetchMemberBodyTests as jest.MockedFunction<
  typeof membersApi.fetchMemberBodyTests
>;
const mockFetchMemberInjuries = membersApi.fetchMemberInjuries as jest.MockedFunction<
  typeof membersApi.fetchMemberInjuries
>;
const mockFetchMemberMedications = membersApi.fetchMemberMedications as jest.MockedFunction<
  typeof membersApi.fetchMemberMedications
>;
const mockFetchMemberCheckIns = membersApi.fetchMemberCheckIns as jest.MockedFunction<
  typeof membersApi.fetchMemberCheckIns
>;
const mockFetchMemberOverviewStats = membersApi.fetchMemberOverviewStats as jest.MockedFunction<
  typeof membersApi.fetchMemberOverviewStats
>;

const MOCK_OVERVIEW: MemberOverview = {
  joinedAt: '2024-01-01T00:00:00.000Z',
  lastBodyTestDate: null,
  lastCheckinDate: null,
};

const MOCK_OVERVIEW_STATS: MemberOverviewStats = {
  sessionsThisMonth: 5,
  weight: { value: 80.0, deltaKg: -0.5 },
  bodyFat: { pct: 20.0, deltaPct: -0.2 },
  topPR: { exerciseName: 'Squat', estimatedOneRM: 150 },
  activePlan: { name: 'Power Plan', dayCount: 5 },
  activeInjuryCount: 0,
  activeMedicationCount: 1,
  weightTrend: [{ date: '2026-05-01', weight: 80.5 }, { date: '2026-06-01', weight: 80.0 }],
  heatmap: [{ date: '2026-06-01', count: 1 }],
};

const MOCK_BODY_TESTS: BodyTest[] = [];
const MOCK_INJURIES: Injury[] = [];
const MOCK_MEDICATIONS: Medication[] = [];
const MOCK_CHECK_INS: CheckIn[] = [];

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

describe('membersStore > fetchMemberDetail', () => {
  it('stores overviewStats alongside existing detail fields', async () => {
    mockFetchMemberOverview.mockResolvedValueOnce(MOCK_OVERVIEW);
    mockFetchMemberBodyTests.mockResolvedValueOnce(MOCK_BODY_TESTS);
    mockFetchMemberInjuries.mockResolvedValueOnce(MOCK_INJURIES);
    mockFetchMemberMedications.mockResolvedValueOnce(MOCK_MEDICATIONS);
    mockFetchMemberCheckIns.mockResolvedValueOnce(MOCK_CHECK_INS);
    mockFetchMemberOverviewStats.mockResolvedValueOnce(MOCK_OVERVIEW_STATS);

    await useMembersStore.getState().fetchMemberDetail('mem1');

    const state = useMembersStore.getState();
    const detail = state.selectedMembers['mem1'];
    expect(detail).toBeDefined();
    expect(detail.overview).toEqual(MOCK_OVERVIEW);
    expect(detail.overviewStats).toEqual(MOCK_OVERVIEW_STATS);
    expect(detail.bodyTests).toEqual(MOCK_BODY_TESTS);
  });
});

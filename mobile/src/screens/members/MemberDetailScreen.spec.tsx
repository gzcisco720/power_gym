/**
 * Stage 3 unit tests — MemberDetailScreen, MemberOverviewTab, MemberBodyTestsTab, MemberHealthTab
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: jest.fn(),
}));

jest.mock('../../stores/members.store', () => ({
  useMembersStore: jest.fn(),
}));

jest.mock('../../stores/member-photos.store', () => ({
  useMemberPhotosStore: jest.fn((selector) => {
    const state = {
      photosByMember: { mem1: [] },
      loadingByMember: { mem1: false },
      errorByMember: { mem1: null },
      fetchPhotos: jest.fn().mockResolvedValue(undefined),
    };
    if (typeof selector === 'function') return selector(state);
    return state;
  }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useRoute } from '@react-navigation/native';
import { useMembersStore } from '../../stores/members.store';
import { Member, MemberOverview } from '../../types/members';
import { BodyTest } from '../../types/body-tests';
import { Injury, Medication } from '../../types/health';
import { MemberDetailScreen } from './MemberDetailScreen';
import { MemberOverviewTab } from './tabs/MemberOverviewTab';
import { MemberBodyTestsTab } from './tabs/MemberBodyTestsTab';
import { MemberHealthTab } from './tabs/MemberHealthTab';

const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseStore = useMembersStore as jest.MockedFunction<typeof useMembersStore>;

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'mem1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    trainerId: 'trainer1',
    trainerName: 'Bob Trainer',
    ...overrides,
  };
}

function makeOverview(overrides: Partial<MemberOverview> = {}): MemberOverview {
  return {
    joinedAt: '2024-01-15T00:00:00.000Z',
    lastBodyTestDate: '2024-06-01T00:00:00.000Z',
    lastCheckinDate: '2024-06-02T00:00:00.000Z',
    ...overrides,
  };
}

function makeBodyTest(overrides: Partial<BodyTest> = {}): BodyTest {
  return {
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
    ...overrides,
  };
}

function makeInjury(overrides: Partial<Injury> = {}): Injury {
  return {
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
    ...overrides,
  };
}

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
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
    ...overrides,
  };
}

type DetailSlice = {
  overview: MemberOverview;
  bodyTests: BodyTest[];
  injuries: Injury[];
  medications: Medication[];
};

function makeStoreState(
  memberId: string,
  member: Member,
  detail: DetailSlice,
  overrides: { detailLoading?: boolean } = {},
) {
  return {
    members: [member],
    loading: false,
    error: null,
    searchQuery: '',
    detailLoading: overrides.detailLoading ?? false,
    detailError: null,
    selectedMembers: { [memberId]: detail },
    fetchMembers: jest.fn(),
    filteredMembers: jest.fn(() => [member]),
    setSearchQuery: jest.fn(),
    fetchMemberDetail: jest.fn(),
  };
}

function setupStore(state: ReturnType<typeof makeStoreState>) {
  mockUseStore.mockImplementation(
    (selector?: (s: ReturnType<typeof makeStoreState>) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

function setupRoute(memberId: string) {
  mockUseRoute.mockReturnValue({
    key: 'MemberDetail',
    name: 'MemberDetail',
    params: { memberId },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── MemberDetailScreen ────────────────────────────────────────────────────────

describe('MemberDetailScreen', () => {
  it('renders header with member name, email, role badge, and trainer name', () => {
    setupRoute('mem1');
    const member = makeMember();
    const detail: DetailSlice = {
      overview: makeOverview(),
      bodyTests: [],
      injuries: [],
      medications: [],
    };
    setupStore(makeStoreState('mem1', member, detail));

    const { getByTestId, getByText } = render(<MemberDetailScreen />);

    expect(getByTestId('screen-MemberDetail')).toBeTruthy();
    expect(getByText('Alice Smith')).toBeTruthy();
    expect(getByText('alice@example.com')).toBeTruthy();
    expect(getByText('member')).toBeTruthy();
    expect(getByText('Bob Trainer')).toBeTruthy();
  });

  it('Overview tab shows join date, last body test date, last check-in date', () => {
    setupRoute('mem1');
    const member = makeMember();
    const detail: DetailSlice = {
      overview: makeOverview({
        joinedAt: '2024-01-15T00:00:00.000Z',
        lastBodyTestDate: '2024-06-01T00:00:00.000Z',
        lastCheckinDate: '2024-06-02T00:00:00.000Z',
      }),
      bodyTests: [],
      injuries: [],
      medications: [],
    };
    setupStore(makeStoreState('mem1', member, detail));

    const { getByTestId } = render(<MemberDetailScreen />);

    // Overview tab is active by default
    expect(getByTestId('member-detail-tab-overview')).toBeTruthy();
    expect(getByTestId('overview-joined-at')).toBeTruthy();
    expect(getByTestId('overview-last-body-test')).toBeTruthy();
    expect(getByTestId('overview-last-checkin')).toBeTruthy();
    // Quick-link cards are present
    expect(getByTestId('overview-link-bodytests')).toBeTruthy();
    expect(getByTestId('overview-link-health')).toBeTruthy();
  });

  it('switches to Body Tests tab on press', () => {
    setupRoute('mem1');
    const member = makeMember();
    const detail: DetailSlice = {
      overview: makeOverview(),
      bodyTests: [],
      injuries: [],
      medications: [],
    };
    setupStore(makeStoreState('mem1', member, detail));

    const { getByTestId } = render(<MemberDetailScreen />);
    fireEvent.press(getByTestId('member-detail-tab-bodytests'));

    expect(getByTestId('member-detail-tab-bodytests')).toBeTruthy();
  });

  it('renders the Photos tab button and shows MemberPhotosTab content when it is selected', () => {
    setupRoute('mem1');
    const member = makeMember();
    const detail: DetailSlice = {
      overview: makeOverview(),
      bodyTests: [],
      injuries: [],
      medications: [],
    };
    setupStore(makeStoreState('mem1', member, detail));

    const { getByTestId } = render(<MemberDetailScreen />);

    // Photos tab button is visible
    expect(getByTestId('member-detail-tab-photos')).toBeTruthy();

    // Tap the Photos tab — the empty state should appear (no photos seeded)
    fireEvent.press(getByTestId('member-detail-tab-photos'));

    expect(getByTestId('photos-empty-state')).toBeTruthy();
  });
});

// ── MemberOverviewTab ─────────────────────────────────────────────────────────

describe('MemberOverviewTab', () => {
  it('renders joinedAt, lastBodyTestDate, lastCheckinDate', () => {
    const overview = makeOverview({
      joinedAt: '2024-01-15T00:00:00.000Z',
      lastBodyTestDate: '2024-06-01T00:00:00.000Z',
      lastCheckinDate: '2024-06-02T00:00:00.000Z',
    });

    const { getByTestId } = render(
      <MemberOverviewTab overview={overview} onNavigateToTab={jest.fn()} />,
    );

    expect(getByTestId('overview-joined-at')).toBeTruthy();
    expect(getByTestId('overview-last-body-test')).toBeTruthy();
    expect(getByTestId('overview-last-checkin')).toBeTruthy();
    expect(getByTestId('overview-link-bodytests')).toBeTruthy();
    expect(getByTestId('overview-link-health')).toBeTruthy();
  });

  it('shows "Never" for null dates', () => {
    const overview = makeOverview({
      joinedAt: null,
      lastBodyTestDate: null,
      lastCheckinDate: null,
    });

    const { getAllByText } = render(
      <MemberOverviewTab overview={overview} onNavigateToTab={jest.fn()} />,
    );

    const neverElements = getAllByText('Never');
    expect(neverElements.length).toBeGreaterThanOrEqual(2);
  });
});

// ── MemberBodyTestsTab ────────────────────────────────────────────────────────

describe('MemberBodyTestsTab', () => {
  it('renders a BodyTestCard per body test', () => {
    const bodyTests = [
      makeBodyTest({ _id: 'bt1' }),
      makeBodyTest({ _id: 'bt2' }),
    ];

    const { getByTestId } = render(
      <MemberBodyTestsTab bodyTests={bodyTests} onPressBodyTest={jest.fn()} />,
    );

    expect(getByTestId('body-test-card-bt1')).toBeTruthy();
    expect(getByTestId('body-test-card-bt2')).toBeTruthy();
  });

  it('shows empty state when no body tests', () => {
    const { getByText } = render(
      <MemberBodyTestsTab bodyTests={[]} onPressBodyTest={jest.fn()} />,
    );

    expect(getByText('No body tests recorded yet.')).toBeTruthy();
  });
});

// ── MemberHealthTab ───────────────────────────────────────────────────────────

describe('MemberHealthTab', () => {
  it('renders active injuries and active medications sections', () => {
    const injuries = [makeInjury({ _id: 'inj1', title: 'Left knee strain' })];
    const medications = [makeMedication({ _id: 'med1', name: 'Ibuprofen' })];

    const { getByText } = render(
      <MemberHealthTab injuries={injuries} medications={medications} />,
    );

    expect(getByText('Left knee strain')).toBeTruthy();
    expect(getByText('Ibuprofen')).toBeTruthy();
  });

  it('shows empty state for injuries and medications when none', () => {
    const { getAllByText } = render(
      <MemberHealthTab injuries={[]} medications={[]} />,
    );

    const noneElements = getAllByText('None');
    expect(noneElements.length).toBeGreaterThanOrEqual(2);
  });
});

import { create } from 'zustand';
import {
  fetchMembers,
  fetchMemberOverview,
  fetchMemberBodyTests,
  fetchMemberInjuries,
  fetchMemberMedications,
  fetchMemberCheckIns,
  fetchMemberOverviewStats,
  assignTrainer as apiAssignTrainer,
} from '../lib/api/members.api';
import { Member, MemberOverview, MemberOverviewStats } from '../types/members';
import { BodyTest } from '../types/body-tests';
import { Injury, Medication } from '../types/health';
import { CheckIn } from '../types/check-ins';

interface MemberDetail {
  overview: MemberOverview;
  overviewStats: MemberOverviewStats | null;
  bodyTests: BodyTest[];
  injuries: Injury[];
  medications: Medication[];
  checkIns: CheckIn[];
}

interface MembersState {
  members: Member[];
  loading: boolean;
  error: string | null;

  selectedMembers: Record<string, MemberDetail>;
  detailLoading: boolean;
  detailError: string | null;

  searchQuery: string;
  trainerFilter: string | null;

  fetchMembers(): Promise<void>;
  fetchMemberDetail(id: string): Promise<void>;
  filteredMembers(): Member[];
  setSearchQuery(query: string): void;
  setTrainerFilter(trainerId: string | null): void;
  assignTrainer(memberId: string, trainerId: string): Promise<void>;
  unassignTrainer(memberId: string): Promise<void>;
}

export const useMembersStore = create<MembersState>((set, get) => ({
  members: [],
  loading: false,
  error: null,

  selectedMembers: {},
  detailLoading: false,
  detailError: null,

  searchQuery: '',
  trainerFilter: null,

  async fetchMembers(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const members = await fetchMembers();
      set({ members, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async fetchMemberDetail(id: string): Promise<void> {
    set({ detailLoading: true, detailError: null });
    try {
      const [overview, bodyTests, injuries, medications, checkIns, overviewStats] =
        await Promise.all([
          fetchMemberOverview(id),
          fetchMemberBodyTests(id),
          fetchMemberInjuries(id),
          fetchMemberMedications(id),
          fetchMemberCheckIns(id),
          fetchMemberOverviewStats(id).catch(() => null),
        ]);
      set((state) => ({
        selectedMembers: {
          ...state.selectedMembers,
          [id]: { overview, overviewStats, bodyTests, injuries, medications, checkIns },
        },
        detailLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ detailLoading: false, detailError: message });
    }
  },

  filteredMembers(): Member[] {
    const { members, searchQuery } = get();
    if (!searchQuery) return members;
    const lower = searchQuery.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(lower));
  },

  setSearchQuery(query: string): void {
    set({ searchQuery: query });
  },

  setTrainerFilter(trainerId: string | null): void {
    set({ trainerFilter: trainerId });
  },

  async assignTrainer(memberId: string, trainerId: string): Promise<void> {
    await apiAssignTrainer(memberId, trainerId);
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId ? { ...m, trainerId } : m,
      ),
    }));
  },

  async unassignTrainer(memberId: string): Promise<void> {
    await apiAssignTrainer(memberId, null);
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId ? { ...m, trainerId: null, trainerName: null } : m,
      ),
    }));
  },
}));

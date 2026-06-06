import { create } from 'zustand';
import {
  fetchMembers,
  fetchMemberOverview,
  fetchMemberBodyTests,
  fetchMemberInjuries,
  fetchMemberMedications,
  fetchMemberCheckIns,
} from '../lib/api/members.api';
import { Member, MemberOverview } from '../types/members';
import { BodyTest } from '../types/body-tests';
import { Injury, Medication } from '../types/health';
import { CheckIn } from '../types/check-ins';

interface MemberDetail {
  overview: MemberOverview;
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

  fetchMembers(): Promise<void>;
  fetchMemberDetail(id: string): Promise<void>;
  filteredMembers(): Member[];
  setSearchQuery(query: string): void;
}

export const useMembersStore = create<MembersState>((set, get) => ({
  members: [],
  loading: false,
  error: null,

  selectedMembers: {},
  detailLoading: false,
  detailError: null,

  searchQuery: '',

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
      const [overview, bodyTests, injuries, medications, checkIns] = await Promise.all([
        fetchMemberOverview(id),
        fetchMemberBodyTests(id),
        fetchMemberInjuries(id),
        fetchMemberMedications(id),
        fetchMemberCheckIns(id),
      ]);
      set((state) => ({
        selectedMembers: {
          ...state.selectedMembers,
          [id]: { overview, bodyTests, injuries, medications, checkIns },
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
}));

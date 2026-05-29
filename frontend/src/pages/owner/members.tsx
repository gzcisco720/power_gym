import { useEffect, useMemo, useReducer } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { useUsersStore } from '@/stores/usersStore';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { variants } from '@/lib/animations/variants';
import { initials } from '@/lib/utils';
import type { Member } from '@/api/users';

const PAGE_SIZE = 10;

interface State {
  reassigning: Member | null;
  selectedTrainerId: string;
  search: string;
  page: number;
  saving: boolean;
}

type Action =
  | { type: 'SET_REASSIGNING'; value: Member | null }
  | { type: 'SET_SELECTED_TRAINER'; value: string }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_PAGE'; value: number }
  | { type: 'SET_SAVING'; value: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_REASSIGNING':
      return { ...state, reassigning: action.value, selectedTrainerId: action.value?.trainerId ?? '' };
    case 'SET_SELECTED_TRAINER':
      return { ...state, selectedTrainerId: action.value };
    case 'SET_SEARCH':
      return { ...state, search: action.value, page: 1 };
    case 'SET_PAGE':
      return { ...state, page: action.value };
    case 'SET_SAVING':
      return { ...state, saving: action.value };
    default:
      return state;
  }
}

export function OwnerMembersPage() {
  const { members, trainers, fetchOwnerMembers, fetchTrainers, assignTrainer, isLoading } =
    useUsersStore();
  const shouldReduceMotion = useReducedMotion();

  const [state, dispatch] = useReducer(reducer, {
    reassigning: null,
    selectedTrainerId: '',
    search: '',
    page: 1,
    saving: false,
  });
  const { reassigning, selectedTrainerId, search, page, saving } = state;

  useEffect(() => {
    void fetchOwnerMembers();
    void fetchTrainers();
  }, [fetchOwnerMembers, fetchTrainers]);

  const animProps = shouldReduceMotion
    ? {}
    : { variants: variants.staggerItem, initial: 'hidden', animate: 'visible' };

  const startOfMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const unassignedCount = useMemo(
    () => members.filter((m) => !m.trainerId).length,
    [members],
  );
  const newThisMonth = useMemo(
    () => members.filter((m) => new Date(m.createdAt) >= startOfMonth).length,
    [members, startOfMonth],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [members, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleAssign() {
    if (!reassigning || !selectedTrainerId) return;
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      await assignTrainer(reassigning._id, selectedTrainerId);
      toast.success(`${reassigning.name} reassigned`);
      dispatch({ type: 'SET_REASSIGNING', value: null });
    } catch {
      toast.error('Failed to reassign member');
      dispatch({ type: 'SET_REASSIGNING', value: null });
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  const subtitle = `${members.length} member${members.length !== 1 ? 's' : ''} across all trainers`;

  return (
    <LazyMotion features={domAnimation}>
      <div>
        <PageHeader title="Members" subtitle={subtitle} />
        <div className="px-4 sm:px-8 py-6 space-y-4">
          {isLoading && members.length === 0 ? (
            <StatCardsSkeleton count={3} className="sm:grid-cols-3" />
          ) : (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Total Members"
                  value={String(members.length)}
                  accentColor="primary"
                />
                <StatCard
                  label="Unassigned"
                  value={String(unassignedCount)}
                  accentColor={unassignedCount > 0 ? 'achievement' : undefined}
                />
                <StatCard
                  label="New This Month"
                  value={String(newThisMonth)}
                  accentColor={newThisMonth > 0 ? 'success' : undefined}
                />
              </div>

              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-foreground/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search members..."
                  value={search}
                  onChange={(e) => dispatch({ type: 'SET_SEARCH', value: e.target.value })}
                  aria-label="Search members"
                  className="w-full h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] pl-9 pr-4 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-white/20 transition-all"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => dispatch({ type: 'SET_SEARCH', value: '' })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Section label */}
              <div className="text-[9px] uppercase tracking-[2px] text-foreground/35 font-semibold">
                {filtered.length === members.length
                  ? `All Members (${members.length})`
                  : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
              </div>

              {/* List */}
              {paginated.length === 0 ? (
                <EmptyState
                  heading={search ? 'No members match your search' : 'No members yet'}
                  description={
                    search
                      ? 'Try a different search term.'
                      : 'Invite members to get started.'
                  }
                />
              ) : (
                <m.div
                  className="space-y-1.5"
                  variants={variants.staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {paginated.map((member) => {
                    const trainerName =
                      trainers.find((t) => t._id === member.trainerId)?.name ?? null;
                    const isReassigning = reassigning?._id === member._id;

                    return (
                      <m.div
                        key={member._id}
                        className="flex items-center gap-3 px-3 py-2 bg-card ring-1 ring-foreground/10 rounded-xl hover:ring-foreground/25 transition-all"
                        {...animProps}
                      >
                        {/* Avatar */}
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-light">
                          {initials(member.name)}
                        </div>

                        {/* Name + email */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground/85 truncate">
                            {member.name}
                          </div>
                          <div className="text-[11px] text-foreground/35 mt-0.5 truncate">
                            {member.email}
                          </div>
                        </div>

                        {/* Trainer badge */}
                        <div className="hidden sm:block shrink-0">
                          {trainerName ? (
                            <span className="text-[11px] font-medium text-foreground/50 bg-white/[.05] ring-1 ring-white/[.08] rounded px-2 py-0.5">
                              {trainerName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-foreground/20 italic">
                              Unassigned
                            </span>
                          )}
                        </div>

                        {/* Reassign inline */}
                        {isReassigning ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={selectedTrainerId}
                              onChange={(e) =>
                                dispatch({ type: 'SET_SELECTED_TRAINER', value: e.target.value })
                              }
                              aria-label="Select trainer"
                              className="h-7 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] px-2 text-sm text-foreground/80 focus:outline-none focus:ring-white/20 transition-all"
                            >
                              <option value="">Select trainer</option>
                              {trainers.map((t) => (
                                <option key={t._id} value={t._id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              disabled={!selectedTrainerId || saving}
                              onClick={() => void handleAssign()}
                              className="h-7 px-2 text-xs"
                            >
                              {saving ? 'Saving...' : 'Confirm'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={saving}
                              onClick={() => dispatch({ type: 'SET_REASSIGNING', value: null })}
                              className="h-7 px-2 text-xs text-foreground/65"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dispatch({ type: 'SET_REASSIGNING', value: member })}
                            className="text-primary-light/70 hover:text-primary-light hover:bg-primary/10 text-xs h-7 px-2 shrink-0"
                          >
                            Reassign
                          </Button>
                        )}
                      </m.div>
                    );
                  })}
                </m.div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'SET_PAGE', value: Math.max(1, page - 1) })}
                    disabled={safePage <= 1}
                    className="h-8 px-3 rounded-lg text-sm text-foreground/40 bg-white/[.03] ring-1 ring-white/[.07] disabled:opacity-30 hover:ring-white/20 transition-all"
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => dispatch({ type: 'SET_PAGE', value: n })}
                      className={`size-8 rounded-lg text-sm font-medium transition-all ${
                        n === safePage
                          ? 'bg-primary/20 ring-1 ring-primary/40 text-primary-light'
                          : 'text-foreground/40 bg-white/[.03] ring-1 ring-white/[.07] hover:ring-white/20'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'SET_PAGE', value: Math.min(totalPages, page + 1) })
                    }
                    disabled={safePage >= totalPages}
                    className="h-8 px-3 rounded-lg text-sm text-foreground/40 bg-white/[.03] ring-1 ring-white/[.07] disabled:opacity-30 hover:ring-white/20 transition-all"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}

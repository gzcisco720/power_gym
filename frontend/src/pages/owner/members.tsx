import { useEffect, useMemo, useReducer } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ReassignModal } from '@/components/owner/reassign-modal';
import { useMembersStore } from '@/stores/membersStore';
import { initials } from '@/lib/utils';

const PAGE_SIZE = 10;

interface MemberRow {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
  createdAt: string;
}

interface State {
  reassigning: MemberRow | null;
  unassigning: MemberRow | null;
  unassignSaving: boolean;
  search: string;
  trainerFilter: string;
  page: number;
}

type Action =
  | { type: 'SET_REASSIGNING'; value: MemberRow | null }
  | { type: 'SET_UNASSIGNING'; value: MemberRow | null }
  | { type: 'SET_UNASSIGN_SAVING'; value: boolean }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_TRAINER_FILTER'; value: string }
  | { type: 'SET_PAGE'; value: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_REASSIGNING': return { ...state, reassigning: action.value };
    case 'SET_UNASSIGNING': return { ...state, unassigning: action.value };
    case 'SET_UNASSIGN_SAVING': return { ...state, unassignSaving: action.value };
    case 'SET_SEARCH': return { ...state, search: action.value };
    case 'SET_TRAINER_FILTER': return { ...state, trainerFilter: action.value };
    case 'SET_PAGE': return { ...state, page: action.value };
    default: return state;
  }
}

export function OwnerMembersPage() {
  const members = useMembersStore((s) => s.members);
  const trainers = useMembersStore((s) => s.trainers);
  const isLoading = useMembersStore((s) => s.isLoading);
  const fetchStore = useMembersStore((s) => s.fetch);
  const reassign = useMembersStore((s) => s.reassign);

  const [state, dispatch] = useReducer(reducer, {
    reassigning: null,
    unassigning: null,
    unassignSaving: false,
    search: '',
    trainerFilter: 'all',
    page: 1,
  });

  const { reassigning, unassigning, unassignSaving, search, trainerFilter, page } = state;

  useEffect(() => { void fetchStore(); }, [fetchStore]);

  const trainerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of trainers) {
      map.set(t._id, t.name);
    }
    return map;
  }, [trainers]);

  const totalCount = members.length;
  const unassignedCount = useMemo(() => members.filter((m) => !m.trainerId).length, [members]);
  const newThisMonth = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return members.filter((m) => new Date(m.createdAt) >= startOfMonth).length;
  }, [members]);

  const trainerOptions = useMemo(
    () => trainers.map((t) => ({ _id: t._id, name: t.name })),
    [trainers],
  );

  async function handleUnassign() {
    if (!unassigning) return;
    dispatch({ type: 'SET_UNASSIGN_SAVING', value: true });
    try {
      await reassign(unassigning._id, null);
      toast.success(`${unassigning.name} unassigned`);
      dispatch({ type: 'SET_UNASSIGNING', value: null });
    } catch {
      toast.error('Failed to unassign member');
    } finally {
      dispatch({ type: 'SET_UNASSIGN_SAVING', value: false });
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      const matchesTrainer =
        trainerFilter === 'all' ||
        (trainerFilter === 'unassigned' ? !m.trainerId : m.trainerId === trainerFilter);
      return matchesSearch && matchesTrainer;
    });
  }, [members, search, trainerFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleFilterChange(value: string) {
    dispatch({ type: 'SET_TRAINER_FILTER', value });
    dispatch({ type: 'SET_PAGE', value: 1 });
  }

  function handleSearch(value: string) {
    dispatch({ type: 'SET_SEARCH', value });
    dispatch({ type: 'SET_PAGE', value: 1 });
  }

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle={`${totalCount} member${totalCount !== 1 ? 's' : ''} across all trainers`}
      />
      <div className="px-4 sm:px-8 py-7">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Total Members" value={String(totalCount)} accentColor="primary" />
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

        {/* Toolbar */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-foreground/30"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search members"
              className="w-full h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] pl-9 pr-4 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-white/20 transition-all"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={trainerFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] px-3 text-sm text-foreground/60 focus:outline-none focus:ring-white/20 transition-all cursor-pointer"
          >
            <option value="all">All Trainers</option>
            {trainerOptions.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        {/* Section label */}
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/35 font-semibold mb-3">
          {filtered.length === totalCount
            ? `All Members (${totalCount})`
            : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] rounded-xl" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-10 text-center">
            <p className="text-sm text-foreground/40">
              {search || trainerFilter !== 'all' ? 'No members match your filters.' : 'No members yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {paginated.map((member) => {
              const trainerName = member.trainerId ? trainerMap.get(member.trainerId) ?? null : null;
              return (
                <div
                  key={member._id}
                  className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl hover:ring-white/[.12] transition-all"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-light">
                    {initials(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground/85 truncate">{member.name}</div>
                    <div className="text-[11px] text-foreground/35 mt-0.5 truncate">{member.email}</div>
                  </div>
                  <div className="hidden sm:block shrink-0">
                    {trainerName ? (
                      <span className="text-[11px] font-medium text-foreground/50 bg-white/[.05] ring-1 ring-white/[.08] rounded px-2 py-0.5">
                        {trainerName}
                      </span>
                    ) : (
                      <span className="text-[11px] text-foreground/20 italic">Unassigned</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'SET_REASSIGNING', value: member })}
                      className="inline-flex h-7 items-center rounded-lg px-2 text-xs font-medium text-primary-light/70 hover:text-primary-light hover:bg-primary/10 transition-colors"
                    >
                      Reassign
                    </button>
                    {member.trainerId && (
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'SET_UNASSIGNING', value: member })}
                        className="inline-flex h-7 items-center rounded-lg px-2 text-xs font-medium text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        Unassign
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
              onClick={() => dispatch({ type: 'SET_PAGE', value: Math.min(totalPages, page + 1) })}
              disabled={safePage >= totalPages}
              className="h-8 px-3 rounded-lg text-sm text-foreground/40 bg-white/[.03] ring-1 ring-white/[.07] disabled:opacity-30 hover:ring-white/20 transition-all"
            >
              →
            </button>
          </div>
        )}
      </div>

      {reassigning && (
        <ReassignModal
          memberId={reassigning._id}
          memberName={reassigning.name}
          currentTrainerId={reassigning.trainerId}
          trainers={trainerOptions}
          onClose={() => dispatch({ type: 'SET_REASSIGNING', value: null })}
        />
      )}

      <AlertDialog
        open={!!unassigning}
        onOpenChange={(open) => { if (!open) dispatch({ type: 'SET_UNASSIGNING', value: null }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Member</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground/80">{unassigning?.name}</span> will become
              unassigned. Their training history and data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnassign}
              disabled={unassignSaving}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
            >
              {unassignSaving ? 'Saving...' : 'Unassign'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

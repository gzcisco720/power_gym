import { useEffect, useMemo, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { useTrainersStore } from '@/stores/trainersStore';
import { initials } from '@/lib/utils';
import { request } from '@/api/client';

interface TrainerRow {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  memberCount: number;
  sessionsThisMonth: number;
}

interface State {
  removeTarget: TrainerRow | null;
  removing: string | null;
}

type Action =
  | { type: 'SET_REMOVE_TARGET'; value: TrainerRow | null }
  | { type: 'SET_REMOVING'; value: string | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_REMOVE_TARGET': return { ...state, removeTarget: action.value };
    case 'SET_REMOVING': return { ...state, removing: action.value };
    default: return state;
  }
}

export function OwnerTrainersPage() {
  const navigate = useNavigate();
  const { trainers, isLoading, fetchTrainers } = useTrainersStore();
  const [state, dispatch] = useReducer(reducer, { removeTarget: null, removing: null });

  useEffect(() => { void fetchTrainers(); }, [fetchTrainers]);

  const totalSessionsThisMonth = useMemo(
    () => trainers.reduce((sum, t) => sum + t.sessionsThisMonth, 0),
    [trainers],
  );
  const avgMembersPerTrainer = useMemo(
    () => trainers.length > 0
      ? Math.round(trainers.reduce((sum, t) => sum + t.memberCount, 0) / trainers.length)
      : 0,
    [trainers],
  );

  async function handleRemove() {
    const target = state.removeTarget;
    if (!target) return;
    dispatch({ type: 'SET_REMOVE_TARGET', value: null });
    dispatch({ type: 'SET_REMOVING', value: target._id });
    const reassignToId = trainers.find((t) => t._id !== target._id)?._id ?? '';
    try {
      await request<void>(`/api/v1/owner/trainers/${target._id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reassignToId }),
      });
      toast.success('Trainer removed');
      void fetchTrainers();
    } catch {
      toast.error('Failed to remove trainer');
    } finally {
      dispatch({ type: 'SET_REMOVING', value: null });
    }
  }

  return (
    <div>
      <PageHeader
        title="Trainers"
        subtitle={`${trainers.length} trainer${trainers.length !== 1 ? 's' : ''}`}
      />
      <div className="px-4 sm:px-8 py-7">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Total Trainers" value={String(trainers.length)} accentColor="primary" />
          <StatCard label="Sessions / Mo" value={String(totalSessionsThisMonth)} />
          <StatCard label="Avg Members / Trainer" value={String(avgMembersPerTrainer)} />
        </div>

        {/* Section label */}
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/35 font-semibold mb-3">
          All Trainers ({trainers.length})
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] rounded-xl" />
            ))}
          </div>
        ) : trainers.length === 0 ? (
          <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-10 text-center">
            <p className="text-sm text-foreground/40">No trainers yet. Invite one to get started.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {trainers.map((trainer) => (
              <div
                key={trainer._id}
                className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl hover:ring-white/[.12] transition-all"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-[11px] font-bold text-primary-foreground shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                  {initials(trainer.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground/85 truncate">{trainer.name}</div>
                  <div className="text-[11px] text-foreground/35 mt-0.5 truncate">{trainer.email}</div>
                </div>

                <div className="hidden sm:flex items-center gap-5 shrink-0">
                  <div className="text-center">
                    <div className="text-base font-bold text-foreground/85 leading-none">{trainer.memberCount}</div>
                    <div className="text-[9px] uppercase tracking-[1.5px] text-foreground/30 mt-0.5">members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-bold text-foreground/85 leading-none">{trainer.sessionsThisMonth}</div>
                    <div className="text-[9px] uppercase tracking-[1.5px] text-foreground/30 mt-0.5">sessions</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/owner/trainers/${trainer._id}`)}
                    className="inline-flex h-8 items-center rounded-lg bg-primary/15 px-3 text-xs font-semibold text-primary-light hover:bg-primary/25 transition-colors"
                  >
                    View Hub →
                  </button>
                  <button
                    type="button"
                    disabled={state.removing === trainer._id}
                    onClick={() => dispatch({ type: 'SET_REMOVE_TARGET', value: trainer })}
                    className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                  >
                    {state.removing === trainer._id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      'Remove'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!state.removeTarget}
        onOpenChange={(open) => { if (!open) dispatch({ type: 'SET_REMOVE_TARGET', value: null }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Trainer</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <span className="font-semibold text-foreground/80">{state.removeTarget?.name}</span>?
              Their {state.removeTarget?.memberCount ?? 0} member{(state.removeTarget?.memberCount ?? 0) !== 1 ? 's' : ''} will
              be reassigned to another trainer. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              Remove Trainer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

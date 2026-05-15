'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { StatCard } from '@/components/shared/stat-card';
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
import { initials } from '@/lib/utils';

interface TrainerRow {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  memberCount: number;
  sessionsThisMonth: number;
}

interface Props {
  trainers: TrainerRow[];
  allTrainers: TrainerRow[];
  totalMembers: number;
  totalSessionsThisMonth: number;
}

export function TrainerListClient({ trainers, allTrainers, totalMembers, totalSessionsThisMonth }: Props) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TrainerRow | null>(null);

  async function handleRemove() {
    if (!removeTarget) return;
    const reassignToId = allTrainers.find((t) => t._id !== removeTarget._id)?._id ?? '';
    const targetId = removeTarget._id;
    setRemoveTarget(null);
    setRemoving(targetId);
    try {
      const res = await fetch(`/api/owner/trainers/${targetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reassignToId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to remove trainer');
        return;
      }
      toast.success('Trainer removed');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Trainers" value={String(trainers.length)} accentColor="primary" />
        <StatCard label="Total Members" value={String(totalMembers)} />
        <StatCard label="Sessions / Mo" value={String(totalSessionsThisMonth)} />
      </div>

      {/* Section label */}
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/35 font-semibold mb-3">
        All Trainers ({trainers.length})
      </div>

      {/* List */}
      {trainers.length === 0 ? (
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-[11px] font-bold text-primary-foreground shadow-[0_0_12px_rgba(99,102,241,0.3)]">
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
                <Link
                  href={`/owner/trainers/${trainer._id}`}
                  className="inline-flex h-8 items-center rounded-lg bg-primary/15 px-3 text-xs font-semibold text-primary-light hover:bg-primary/25 transition-colors"
                >
                  View Hub →
                </Link>
                <button
                  disabled={removing === trainer._id}
                  onClick={() => setRemoveTarget(trainer)}
                  className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                >
                  {removing === trainer._id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Remove'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Trainer</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <span className="font-semibold text-foreground/80">{removeTarget?.name}</span>?
              Their {removeTarget?.memberCount ?? 0} member{(removeTarget?.memberCount ?? 0) !== 1 ? 's' : ''} will
              be reassigned to another trainer. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Trainer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

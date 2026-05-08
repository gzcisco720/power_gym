'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { NewBodyTestDialog } from './new-body-test-dialog';
import type { BodyTestRecord } from './types';

export type { BodyTestRecord } from './types';

interface Props {
  memberId: string;
  memberName?: string;
  initialTests: BodyTestRecord[];
  defaultSex?: 'male' | 'female' | null;
  defaultAge?: number | null;
}

const ACCENT_BORDERS = [
  'border-t-rose-400/50',
  'border-t-violet-400/50',
  'border-t-sky-400/50',
  'border-t-amber-400/50',
  'border-t-emerald-400/50',
];

const PROTOCOL_LABELS: Record<string, string> = {
  '3site': '3-Site · Jackson-Pollock',
  '7site': '7-Site · Jackson-Pollock',
  '9site': '9-Site · Parrillo',
  other: 'Other',
};

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function sortByDateDesc(tests: BodyTestRecord[]): BodyTestRecord[] {
  return [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function BodyTestClient({ memberId, memberName, initialTests, defaultSex, defaultAge }: Props) {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const [tests, setTests] = useState<BodyTestRecord[]>(sortByDateDesc(initialTests));
  const [deleteTarget, setDeleteTarget] = useState<BodyTestRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const latest = tests[0] ?? null;
  const prev = tests[1] ?? null;
  const bfChange = latest && prev ? latest.bodyFatPct - prev.bodyFatPct : null;

  function handleSaved(test: BodyTestRecord) {
    setTests((current) => sortByDateDesc([test, ...current]));
    router.refresh();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/members/${memberId}/body-tests/${deleteTarget._id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to delete');
        return;
      }
      setTests((current) => current.filter((t) => t._id !== deleteTarget._id));
      toast.success('Body test deleted');
      router.refresh();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const dialogTrigger = (
    <NewBodyTestDialog
      memberId={memberId}
      defaultSex={defaultSex}
      defaultAge={defaultAge}
      previousTest={tests[0] ?? null}
      onSaved={handleSaved}
    />
  );

  return (
    <div>
      <PageHeader
        title={memberName ? `${memberName}'s Body Tests` : 'Body Tests'}
        subtitle={`${tests.length} record${tests.length !== 1 ? 's' : ''}`}
        actions={dialogTrigger}
      />

      <div className="px-4 sm:px-8 py-7">
        {tests.length === 0 ? (
          <EmptyState
            heading="No body tests yet"
            description="Record the first body composition test."
            action={dialogTrigger}
          />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-4 gap-3 rounded-xl bg-[#080808] border border-[#141414] p-4">
              <SummaryCell label="Latest Weight" value={String(latest!.weight)} unit="kg" color="text-foreground" />
              <SummaryCell label="Body Fat" value={latest!.bodyFatPct.toFixed(1)} unit="%" color="text-rose-400" />
              <SummaryCell label="Lean Mass" value={latest!.leanMassKg.toFixed(1)} unit="kg" color="text-sky-400" />
              <SummaryCell
                label="BF Change"
                value={bfChange !== null ? (bfChange > 0 ? `+${bfChange.toFixed(1)}` : bfChange.toFixed(1)) : '—'}
                unit={bfChange !== null ? '%' : ''}
                color={bfChange === null ? 'text-foreground/30' : bfChange > 0 ? 'text-rose-400' : 'text-emerald-400'}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tests.map((test, i) => {
                const accent = ACCENT_BORDERS[hashIndex(test._id, ACCENT_BORDERS.length)];
                return (
                  <motion.div
                    key={test._id}
                    initial={{ opacity: 0, y: shouldReduce ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: shouldReduce ? 0 : i * 0.04 }}
                    className="relative"
                  >
                    <div className={`rounded-xl border border-[#141414] border-t-2 ${accent} bg-[#0c0c0c] p-4 pr-11`}>
                      <div className="text-sm font-semibold text-white">
                        {new Date(test.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="mt-1.5 inline-flex rounded px-1.5 py-0.5 text-[10px] ring-1 bg-violet-500/10 text-violet-300 ring-violet-500/20">
                        {PROTOCOL_LABELS[test.protocol] ?? test.protocol}
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-[#1a1a1a] pt-3 text-center">
                        <StatCell value={String(test.weight)} unit="kg" label="Weight" color="text-foreground" />
                        <StatCell value={test.bodyFatPct.toFixed(1)} unit="%" label="BF" color="text-rose-400" />
                        <StatCell value={test.leanMassKg.toFixed(1)} unit="kg" label="Lean" color="text-sky-400" />
                        <StatCell value={test.fatMassKg.toFixed(1)} unit="kg" label="Fat" color="text-amber-400" />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(test)}
                      className="absolute right-2 top-2 size-8 text-foreground/40 hover:bg-[#141414] hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="bg-[#0c0c0c] border-[#1e1e1e] max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Body Test</DialogTitle>
            <DialogDescription className="text-foreground/65">
              {deleteTarget
                ? new Date(deleteTarget.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : ''}{' '}
              — are you sure? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-foreground/65 border border-[#222]">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCell({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold leading-none ${color}`}>
        {value}<span className="text-xs opacity-50 ml-0.5">{unit}</span>
      </div>
      <div className="mt-1.5 text-[9px] uppercase tracking-wider text-foreground/40">{label}</div>
    </div>
  );
}

function StatCell({ value, unit, label, color }: { value: string; unit: string; label: string; color: string }) {
  return (
    <div>
      <div className={`text-[13px] font-semibold leading-none ${color}`}>
        {value}<span className="text-[9px] opacity-50">{unit}</span>
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-wider text-foreground/40">{label}</div>
    </div>
  );
}

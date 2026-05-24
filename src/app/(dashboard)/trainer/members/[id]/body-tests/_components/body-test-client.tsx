'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
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
import { MemberBodyChartClient } from '@/app/(dashboard)/member/_components/member-body-chart-client';
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

const PROTOCOL_LABELS: Record<string, string> = {
  '3site': '3-Site · Jackson-Pollock',
  '7site': '7-Site · Jackson-Pollock',
  '9site': '9-Site · Parrillo',
  other: 'Other',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatTestDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function sortByDateDesc(tests: BodyTestRecord[]): BodyTestRecord[] {
  return [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function BodyTestClient({ memberId, memberName, initialTests, defaultSex, defaultAge }: Props) {
  const { refresh } = useRouter();
  const shouldReduce = useReducedMotion();
  const [tests, setTests] = useState<BodyTestRecord[]>(sortByDateDesc(initialTests));
  const [deleteTarget, setDeleteTarget] = useState<BodyTestRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const latest = tests[0] ?? null;
  const prev = tests[1] ?? null;
  const bfChange = latest && prev ? latest.bodyFatPct - prev.bodyFatPct : null;

  // Compute chart points in chronological order from the sorted-desc list
  const chartPoints = [...tests]
    .reverse()
    .map((t) => ({
      date: `${MONTHS[new Date(t.date).getMonth()]} ${new Date(t.date).getDate()}`,
      weight: parseFloat(t.weight.toFixed(1)),
      bodyFatPct: parseFloat(t.bodyFatPct.toFixed(1)),
    }));

  // Only show protocol badge per-card if tests use multiple different protocols
  const uniqueProtocols = new Set(tests.map((t) => t.protocol));
  const allSameProtocol = uniqueProtocols.size === 1;
  const sharedProtocolLabel = allSameProtocol
    ? (PROTOCOL_LABELS[tests[0]!.protocol] ?? tests[0]!.protocol)
    : null;

  function handleSaved(test: BodyTestRecord) {
    setTests((current) => sortByDateDesc([test, ...current]));
    refresh();
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
      refresh();
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
        subtitle={`${tests.length} record${tests.length !== 1 ? 's' : ''}${sharedProtocolLabel ? ` · ${sharedProtocolLabel}` : ''}`}
        actions={dialogTrigger}
      />

      <div className="px-4 sm:px-8 py-7 space-y-6">
        {tests.length === 0 ? (
          <EmptyState
            heading="No body tests yet"
            description="Record the first body composition test."
            action={dialogTrigger}
          />
        ) : (
          <>
            {/* Trend chart */}
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/65 mb-3">
                Body Composition Trend
              </div>
              <MemberBodyChartClient points={chartPoints} />
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
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

            {/* Test cards */}
            <motion.div
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              variants={variants.staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {tests.map((test) => (
                <motion.div
                  key={test._id}
                  variants={shouldReduce ? undefined : variants.staggerItem}
                  initial={shouldReduce ? { opacity: 1 } : undefined}
                  className="relative"
                >
                  <div className="rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 transition-shadow p-4 pr-11">
                    <div className="text-sm font-semibold text-foreground">
                      {formatTestDate(test.date)}
                    </div>
                    {!allSameProtocol && (
                      <div className="mt-1.5 inline-flex rounded px-1.5 py-0.5 text-[10px] ring-1 bg-primary/10 text-primary-light ring-primary/20">
                        {PROTOCOL_LABELS[test.protocol] ?? test.protocol}
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-foreground/8 pt-3 text-center">
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
                    className="absolute right-2 top-2 size-8 text-foreground/30 hover:bg-muted hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Body Test</DialogTitle>
            <DialogDescription className="text-foreground/65">
              {deleteTarget ? formatTestDate(deleteTarget.date) : ''}: are you sure? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
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

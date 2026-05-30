import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMemberJourneyStore } from '@/stores/memberJourneyStore';
import type { JourneyItem, JourneySummary, MilestoneTagColor } from '@/api/member-portal';

// ─── Journey Header ───────────────────────────────────────────────────────────

function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function formatDelta(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}`;
}

function JourneyHeader({ summary }: { summary: JourneySummary }) {
  const hasComparison = summary.totalTests >= 2;
  const bfDelta = hasComparison
    ? Math.round((summary.latestBodyFatPct - summary.firstBodyFatPct) * 10) / 10
    : null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/[0.03] p-4 shadow-[0_4px_24px_rgba(99,102,241,0.1)]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold leading-tight">My Journey</h1>
          <p className="text-foreground/65 text-xs mt-0.5">
            {summary.totalTests} tests · started {formatMonthYear(summary.firstTestDate)}
          </p>
        </div>
        {bfDelta !== null && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              bfDelta < 0
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {bfDelta < 0 ? '↓' : '↑'} {Math.abs(bfDelta)}% body fat
          </span>
        )}
      </div>

      {hasComparison && (
        <div className="flex gap-0 border-t border-primary/15 pt-3">
          <div className="flex-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/65 mb-1">
              Start
            </p>
            <p className="text-foreground text-sm font-bold">{summary.firstBodyFatPct}%</p>
            <p className="text-foreground/65 text-[10px]">
              {summary.firstWeight} kg · {formatMonthYear(summary.firstTestDate)}
            </p>
          </div>
          <div className="flex-1 border-l border-primary/15 pl-3 ml-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/65 mb-1">
              Now
            </p>
            <p className="text-primary-light text-sm font-bold">{summary.latestBodyFatPct}%</p>
            <p className="text-foreground/65 text-[10px]">{summary.latestWeight} kg</p>
          </div>
          <div className="flex-1 border-l border-primary/15 pl-3 ml-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/65 mb-1">
              Lean Mass
            </p>
            <p
              className={`text-sm font-bold ${
                summary.leanMassDeltaKg >= 0 ? 'text-emerald-400' : 'text-destructive'
              }`}
            >
              {formatDelta(summary.leanMassDeltaKg)} kg
            </p>
            <p className="text-foreground/65 text-[10px]">
              {summary.firstLeanMassKg.toFixed(1)} → {summary.latestLeanMassKg.toFixed(1)} kg
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline Node ────────────────────────────────────────────────────────────

function TimelineNode({ item, isLast }: { item: JourneyItem; isLast: boolean }) {
  const { bodyTest } = item;
  const bfDelta = bodyTest.deltaBodyFatPct;
  const isImprovement = bfDelta !== null && bfDelta < 0;
  const date = new Date(bodyTest.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex flex-col items-center w-3.5 shrink-0">
        <div className="mt-2.5 size-2.5 rounded-full bg-primary/40 border border-primary/20 shrink-0 z-10" />
        {!isLast && (
          <div className="flex-1 w-0.5 bg-primary/20 rounded-full mt-1 min-h-2" />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2.5 bg-card rounded-lg border border-foreground/[0.06] px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-foreground/65 text-[10px] mb-0.5">
              {date} · Test #{bodyTest.testNumber}
            </p>
            <p className="text-foreground/90 text-xs font-semibold">
              Body fat {bodyTest.bodyFatPct}% · {bodyTest.weight} kg
            </p>
            {bfDelta !== null && (
              <p
                className={`text-[10px] mt-0.5 ${
                  isImprovement ? 'text-emerald-400' : 'text-foreground/65'
                }`}
              >
                {isImprovement ? '↓' : '↑'} {Math.abs(bfDelta).toFixed(1)}% · Lean mass{' '}
                {bodyTest.leanMassKg.toFixed(1)} kg
              </p>
            )}
          </div>
          <div className="size-9 rounded-md overflow-hidden shrink-0 bg-foreground/[0.04] flex items-center justify-center border border-dashed border-foreground/10">
            {item.checkInPhoto ? (
              <img
                src={item.checkInPhoto}
                alt="Check-in photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm">📷</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Milestone Card ───────────────────────────────────────────────────────────

const TAG_CLASSES: Record<MilestoneTagColor, string> = {
  gold: 'bg-amber-500/10 text-amber-400',
  green: 'bg-emerald-500/10 text-emerald-400',
  indigo: 'bg-primary/[0.18] text-primary-light',
};

function MilestoneCard({ item, isLast }: { item: JourneyItem; isLast: boolean }) {
  const { bodyTest, milestone } = item;
  if (!milestone) return null;

  const date = new Date(bodyTest.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
  const hasLeanMassPB = milestone.tags.some((t) => t.label.includes('All-time high lean mass'));

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex flex-col items-center w-3.5 shrink-0">
        <div className="mt-4 size-3.5 rounded-full bg-primary border-2 border-primary/40 shrink-0 z-10 shadow-[0_0_0_4px_rgba(99,102,241,0.15),0_0_12px_rgba(99,102,241,0.3)]" />
        {!isLast && (
          <div className="flex-1 w-0.5 bg-primary/20 rounded-full mt-1 min-h-2" />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-2 -ml-1">
        <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/[0.13] to-primary/[0.04] p-3.5 shadow-[0_4px_24px_rgba(99,102,241,0.1)]">
          <div className="flex items-start gap-2 mb-2.5">
            <span className="text-base shrink-0">{milestone.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-primary-light/70 text-[10px] mb-0.5">{date}</p>
              <p className="text-foreground text-sm font-bold leading-snug">{milestone.title}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {milestone.tags.map((tag) => (
              <span
                key={tag.label}
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${TAG_CLASSES[tag.color]}`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          <div className="flex mb-3">
            <div className="flex-1">
              <p className="text-primary-light/50 text-[9px] uppercase tracking-wider mb-0.5">
                Body Fat
              </p>
              <p className="text-foreground text-sm font-bold">{bodyTest.bodyFatPct}%</p>
              {bodyTest.deltaBodyFatPct !== null && (
                <p
                  className={`text-[10px] mt-0.5 ${
                    bodyTest.deltaBodyFatPct < 0 ? 'text-emerald-400' : 'text-foreground/65'
                  }`}
                >
                  {bodyTest.deltaBodyFatPct < 0 ? '' : '+'}
                  {bodyTest.deltaBodyFatPct.toFixed(1)}% vs last
                </p>
              )}
            </div>
            <div className="flex-1 border-l border-primary/15 pl-2.5 ml-2.5">
              <p className="text-primary-light/50 text-[9px] uppercase tracking-wider mb-0.5">
                Weight
              </p>
              <p className="text-foreground text-sm font-bold">{bodyTest.weight} kg</p>
              {bodyTest.deltaWeight !== null && (
                <p
                  className={`text-[10px] mt-0.5 ${
                    bodyTest.deltaWeight < 0 ? 'text-emerald-400' : 'text-foreground/65'
                  }`}
                >
                  {bodyTest.deltaWeight > 0 ? '+' : ''}
                  {bodyTest.deltaWeight.toFixed(1)} kg
                </p>
              )}
            </div>
            <div className="flex-1 border-l border-primary/15 pl-2.5 ml-2.5">
              <p className="text-primary-light/50 text-[9px] uppercase tracking-wider mb-0.5">
                Lean Mass
              </p>
              <p className="text-foreground text-sm font-bold">
                {bodyTest.leanMassKg.toFixed(1)} kg
              </p>
              {hasLeanMassPB && (
                <p className="text-primary-light/50 text-[10px] mt-0.5">All-time high</p>
              )}
            </div>
          </div>

          {milestone.photos.length > 0 && (
            <div className="flex gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-14 rounded-lg overflow-hidden bg-primary/[0.04] border border-dashed border-primary/20 flex items-center justify-center"
                >
                  {milestone.photos[i] ? (
                    <img
                      src={milestone.photos[i]}
                      alt={`Milestone photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg text-foreground/10">📷</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MemberJourneyPage ────────────────────────────────────────────────────────

export function MemberJourneyPage() {
  const user = useAuthStore((s) => s.user);
  const { items, summary, nextCursor, isLoading, fetch, loadMore } =
    useMemberJourneyStore();

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextCursorRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  const doLoadMore = useCallback(async () => {
    if (!user || !nextCursorRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    await loadMore(user.id);
    loadingMoreRef.current = false;
  }, [user, loadMore]);

  useEffect(() => {
    if (!user) return;
    void fetch(user.id);
  }, [user, fetch]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void doLoadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [doLoadMore]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center w-3.5 shrink-0">
              <div className="mt-2.5 size-2.5 rounded-full bg-foreground/10 animate-pulse" />
              <div className="flex-1 w-0.5 bg-foreground/[0.06] mt-1 min-h-10" />
            </div>
            <div className="flex-1 pb-2">
              <div className="h-12 rounded-lg bg-foreground/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-center py-20 text-center gap-3">
        <span className="text-4xl">🏋️</span>
        <p className="text-foreground font-semibold">No body tests recorded yet</p>
        <p className="text-foreground/65 text-sm">
          Ask your trainer to schedule your first body test
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      <JourneyHeader summary={summary} />

      <div className="flex flex-col">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 && !nextCursor;
          return item.milestone ? (
            <MilestoneCard key={item.bodyTest.id} item={item} isLast={isLast} />
          ) : (
            <TimelineNode key={item.bodyTest.id} item={item} isLast={isLast} />
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {!nextCursor && !isLoading && items.length > 0 && (
        <p className="text-center text-foreground/65 text-xs py-4">· All records shown ·</p>
      )}
    </div>
  );
}

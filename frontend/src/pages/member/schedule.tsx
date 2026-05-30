import { useEffect, useReducer, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { fetchMemberSessions } from '@/api/schedule';
import type { MemberScheduleItem } from '@/api/schedule';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

// ─── Utils ────────────────────────────────────────────────────────────────────

function daysUntil(isoDate: string): number {
  const d = new Date(isoDate);
  const sessionMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((sessionMidnight.getTime() - todayMidnight.getTime()) / 86400000);
}

// ─── Hero card ────────────────────────────────────────────────────────────────

function SessionHero({ session }: { session: MemberScheduleItem }) {
  const days = daysUntil(session.date);
  const isToday = days === 0;
  const d = new Date(session.date);
  const dateLabel = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const groupLabel = session.memberCount > 1 ? `Group (${session.memberCount})` : '1-on-1';

  return (
    <div
      className={`rounded-xl p-4 bg-primary/[.07] ${
        isToday ? 'ring-1 ring-primary/40' : 'ring-1 ring-primary/[.16]'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-light">
          {isToday ? "Today's Session" : 'Next Session'}
        </span>
        <span
          className={`text-[11px] rounded px-2 py-0.5 ${
            isToday
              ? 'bg-primary/[.20] text-primary-light font-semibold'
              : 'bg-primary/[.12] text-primary-light'
          }`}
        >
          {isToday ? 'Today' : `in ${days} day${days === 1 ? '' : 's'}`}
        </span>
      </div>
      <div className="text-[18px] font-bold text-foreground">{dateLabel}</div>
      <div className="text-[13px] text-foreground/65 mt-1">
        {session.startTime} – {session.endTime}
      </div>
      <div className="text-[12px] text-foreground/65 mt-1">{groupLabel}</div>
      {session.isRecurring && (
        <span className="inline-block mt-3 text-[10px] bg-primary/[.12] text-primary-light rounded px-2 py-0.5 border border-primary/[.16]">
          ↺ Recurring
        </span>
      )}
    </div>
  );
}

// ─── Upcoming timeline ────────────────────────────────────────────────────────

const WINDOW_DAYS = 14;

function UpcomingTimeline({
  sessions,
  heroIsToday,
}: {
  sessions: MemberScheduleItem[];
  heroIsToday: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  if (sessions.length === 0) return null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + WINDOW_DAYS);

  const initial = sessions.filter((s) => new Date(s.date) <= cutoff);
  const extra = sessions.filter((s) => new Date(s.date) > cutoff);
  const visible = showAll ? sessions : initial;
  const hiddenCount = extra.length;

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-3">
        {heroIsToday ? 'Coming Up' : 'Upcoming'}
      </div>
      <div>
        {visible.map((s, i) => {
          const d = new Date(s.date);
          const label = d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const isLast = i === visible.length - 1 && (showAll || hiddenCount === 0);
          return (
            <div key={s._id} className="flex gap-3 items-start">
              <div className="flex flex-col items-center mt-1.5">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isLast && visible.length > 1 ? 'bg-primary/50' : 'bg-primary'
                  }`}
                />
                {!isLast && (
                  <div className="w-px flex-1 bg-foreground/[.05] mt-1 min-h-[18px]" />
                )}
              </div>
              <div className="pb-3">
                <div className="text-[13px] font-semibold text-foreground">{label}</div>
                <div className="text-[11px] text-foreground/65">
                  {s.startTime} – {s.endTime}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-[12px] text-foreground/65 hover:text-foreground/80 transition-colors cursor-pointer mt-1"
        >
          ▸ Load more ({hiddenCount} more)
        </button>
      )}
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────

const INITIAL_COUNT = 10;

function SessionHistory({ sessions, defaultOpen = false }: { sessions: MemberScheduleItem[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  if (sessions.length === 0) return null;

  const visible = showAll ? sessions : sessions.slice(0, INITIAL_COUNT);
  const hiddenCount = sessions.length - INITIAL_COUNT;

  return (
    <div className="pt-3 border-t border-foreground/[.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[12px] text-foreground/65 hover:text-foreground/80 transition-colors cursor-pointer"
      >
        {open ? '▾ Hide history' : `▸ Show history (${sessions.length})`}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {visible.map((s) => {
            const d = new Date(s.date);
            const label = d.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const isCancelled = s.status === 'cancelled';
            return (
              <div key={s._id} className="flex gap-3 items-start opacity-50">
                <div className="mt-1.5 shrink-0">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isCancelled ? 'bg-destructive/30' : 'bg-foreground/30'
                    }`}
                  />
                </div>
                <div>
                  <div className="text-[13px] text-foreground">{label}</div>
                  <div
                    className={`text-[11px] ${
                      isCancelled ? 'text-destructive/60' : 'text-foreground/65'
                    }`}
                  >
                    {isCancelled ? 'Cancelled' : `${s.startTime} – ${s.endTime}`}
                  </div>
                </div>
              </div>
            );
          })}
          {!showAll && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-[12px] text-foreground/65 hover:text-foreground/80 transition-colors cursor-pointer"
            >
              ▸ Load more ({hiddenCount} more)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── State management ─────────────────────────────────────────────────────────

interface ScheduleState {
  upcoming: MemberScheduleItem[];
  history: MemberScheduleItem[];
  isLoading: boolean;
}

type ScheduleAction =
  | { type: 'LOADED'; upcoming: MemberScheduleItem[]; history: MemberScheduleItem[] }
  | { type: 'SET_LOADING'; value: boolean };

function scheduleReducer(state: ScheduleState, action: ScheduleAction): ScheduleState {
  switch (action.type) {
    case 'LOADED':
      return { ...state, upcoming: action.upcoming, history: action.history, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.value };
    default:
      return state;
  }
}

// ─── MemberSchedulePage ───────────────────────────────────────────────────────

export function MemberSchedulePage() {
  const user = useAuthStore((s) => s.user);
  const [state, dispatch] = useReducer(scheduleReducer, {
    upcoming: [],
    history: [],
    isLoading: true,
  });

  useEffect(() => {
    if (!user) return;
    dispatch({ type: 'SET_LOADING', value: true });
    fetchMemberSessions(user.id)
      .then(({ upcoming, history }) => {
        dispatch({ type: 'LOADED', upcoming, history });
      })
      .catch(() => {
        dispatch({ type: 'SET_LOADING', value: false });
      });
  }, [user]);

  const hero = state.upcoming[0] ?? null;
  const timeline = state.upcoming.slice(1);
  const heroIsToday = hero ? daysUntil(hero.date) === 0 : false;

  return (
    <div>
      <PageHeader
        title="My Schedule"
        subtitle={`${state.upcoming.length} upcoming session${state.upcoming.length !== 1 ? 's' : ''}`}
      />

      {state.isLoading ? (
        <div className="px-4 sm:px-8 py-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-4 sm:px-8 py-6 space-y-5">
          {hero ? (
            <SessionHero session={hero} />
          ) : (
            <EmptyState
              heading="No upcoming sessions"
              description="Your trainer hasn't scheduled any sessions yet."
            />
          )}
          <UpcomingTimeline sessions={timeline} heroIsToday={heroIsToday} />
          <SessionHistory sessions={state.history} defaultOpen={!hero} />
        </div>
      )}
    </div>
  );
}

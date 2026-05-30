import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/shared/section-header';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { useMemberHubStore } from '@/stores/memberHubStore';
import type { CheckInRecord, CheckInConfig } from '@/api/member-hub';
import { upsertCheckInConfig } from '@/api/member-hub';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { CheckInRecord };

// ─── Check-in Trends chart ───────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatShortDate(d: Date | string): string {
  const date = new Date(d);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

const DIET_COLOR: Record<string, string> = {
  yes: 'bg-emerald-500',
  partial: 'bg-amber-500',
  no: 'bg-rose-500',
};
const DIET_LABEL: Record<string, string> = {
  yes: 'Stuck to diet',
  partial: 'Partial',
  no: 'Off track',
};

interface CheckInTrendsProps {
  checkIns: CheckInRecord[];
}

export function CheckInTrends({ checkIns }: CheckInTrendsProps) {
  if (checkIns.length === 0) return null;

  const scoreData = [...checkIns]
    .slice(0, 12)
    .reverse()
    .map((ci) => ({
      date: formatShortDate(ci.submittedAt),
      avg: parseFloat(
        ((ci.sleepQuality + ci.energy + ci.recovery + ci.stress + ci.fatigue + ci.hunger + ci.digestion) / 7).toFixed(1),
      ),
    }));

  const complianceData = [...checkIns].slice(0, 16).reverse();

  return (
    <div className="px-4 sm:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/65 mb-3">
            Avg Wellness Score
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height={144}>
              <LineChart data={scoreData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: 'currentColor' }}
                  className="text-foreground/50"
                  stroke="currentColor"
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fontSize: 9, fill: 'currentColor' }}
                  className="text-foreground/50"
                  stroke="currentColor"
                  width={20}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(value) => [`${value}/10`, 'Avg score']}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="rgb(99 102 241)"
                  strokeWidth={2}
                  dot={{ fill: 'rgb(99 102 241)', r: 2.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/65 mb-3">
            Diet Compliance
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {complianceData.map((ci, i) => (
              <div
                key={i}
                title={`${formatShortDate(ci.submittedAt)}: ${DIET_LABEL[ci.stuckToDiet]}`}
                className={`size-5 rounded-sm ${DIET_COLOR[ci.stuckToDiet] ?? 'bg-muted'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-emerald-500" />
              <span className="text-[10px] text-foreground/50">Stuck</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-amber-500" />
              <span className="text-[10px] text-foreground/50">Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-rose-500" />
              <span className="text-[10px] text-foreground/50">Off track</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Form ────────────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function pad(n: number) {
  return String(n).padStart(2, '0');
}

interface CheckInScheduleFormProps {
  memberId: string;
  initialConfig: CheckInConfig | null;
}

function CheckInScheduleForm({ memberId, initialConfig }: CheckInScheduleFormProps) {
  const [dayOfWeek, setDayOfWeek] = useState(initialConfig?.dayOfWeek ?? 4);
  const [hour, setHour] = useState(initialConfig?.hour ?? 7);
  const [active, setActive] = useState(initialConfig?.active ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await upsertCheckInConfig(memberId, { dayOfWeek, hour, minute: 0, active });
      toast.success('Schedule saved');
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="px-4 sm:px-8">
      <SectionHeader title="Weekly Reminder" />
      <form
        onSubmit={(e) => { void handleSubmit(e); }}
        className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap"
      >
        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/65" htmlFor="day-select">Day</label>
          <select
            id="day-select"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="rounded-md bg-muted border border-border/60 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/65" htmlFor="hour-select">Hour</label>
          <select
            id="hour-select"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="rounded-md bg-muted border border-border/60 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{pad(h)}:00</option>
            ))}
          </select>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-foreground/65">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            aria-label="Active"
            className="accent-emerald-500 size-3.5"
          />
          Active
        </label>
        <Button
          type="submit"
          disabled={saving}
          size="sm"
          className="text-xs font-semibold sm:ml-auto"
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </section>
  );
}

// ─── Check-In List ────────────────────────────────────────────────────────────

const DIET_LABEL_LIST: Record<string, string> = {
  yes: 'Stuck',
  no: 'Off track',
  partial: 'Partial',
};

const DIET_COLOR_LIST: Record<string, string> = {
  yes: 'text-emerald-400',
  no: 'text-rose-400',
  partial: 'text-amber-400',
};

function formatDate(val: string) {
  return new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface CheckInListProps {
  checkIns: CheckInRecord[];
}

function CheckInList({ checkIns }: CheckInListProps) {
  const [visibleCount, setVisibleCount] = useState(10);
  const visible = checkIns.slice(0, visibleCount);
  const hasMore = checkIns.length > visibleCount;

  return (
    <section className="px-4 sm:px-8">
      <SectionHeader title={`Check-In History${checkIns.length ? ` (${checkIns.length})` : ''}`} />
      {checkIns.length === 0 ? (
        <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <p className="text-sm text-foreground/65">No check-ins submitted yet.</p>
        </div>
      ) : (
        <>
          <ul className="mt-3 space-y-1.5">
            {visible.map((ci) => {
              const avgRating = Math.round(
                (ci.sleepQuality + ci.energy + ci.recovery + ci.stress + ci.fatigue + ci.hunger + ci.digestion) / 7,
              );
              return (
                <li key={ci._id}>
                  <div className="block rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2">
                    <div className="flex items-center">
                      <span className="text-sm font-semibold text-foreground">
                        {formatDate(ci.submittedAt)}
                      </span>
                      <div className="ml-auto flex items-center gap-3 text-xs text-foreground/65 tabular-nums">
                        <span>
                          Avg <strong className="text-foreground">{avgRating}</strong>/10
                        </span>
                        {ci.weight !== null && ci.weight !== undefined && (
                          <>
                            <span className="text-foreground/40">·</span>
                            <span><strong className="text-foreground">{ci.weight}</strong> kg</span>
                          </>
                        )}
                        <span className="text-foreground/40">·</span>
                        <span className={DIET_COLOR_LIST[ci.stuckToDiet] ?? 'text-foreground/65'}>
                          {DIET_LABEL_LIST[ci.stuckToDiet]}
                        </span>
                        {ci.photos.length > 0 && (
                          <>
                            <span className="text-foreground/40">·</span>
                            <span>{ci.photos.length} 📷</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + 10)}
              className="mt-3 w-full rounded-xl border border-foreground/10 py-2.5 text-sm text-foreground/50 hover:text-foreground/75 hover:border-foreground/20 transition-colors"
            >
              Show {Math.min(10, checkIns.length - visibleCount)} more
            </button>
          )}
        </>
      )}
    </section>
  );
}

// ─── Check-Ins Tab (full page) ────────────────────────────────────────────────

export function CheckInsTab() {
  const memberId = useMemberHubStore((s) => s.memberId);
  const checkIns = useMemberHubStore((s) => s.checkIns);
  const checkInConfig = useMemberHubStore((s) => s.checkInConfig);

  if (!memberId) return null;

  return (
    <div className="space-y-8 py-6">
      <CheckInScheduleForm memberId={memberId} initialConfig={checkInConfig} />
      {checkIns.length >= 2 && <CheckInTrends checkIns={checkIns} />}
      <CheckInList checkIns={checkIns} />
    </div>
  );
}

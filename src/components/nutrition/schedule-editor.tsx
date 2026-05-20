'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ISchedule, IWeeklyPatternEntry, ICalendarOverride } from '@/lib/db/models/member-nutrition-plan.model';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
type DayOfWeek = (typeof DAY_VALUES)[number];

const NONE = '__none__';

interface Props {
  memberId: string;
  dayTypeNames: string[];
  initialSchedule: ISchedule;
}

export function ScheduleEditor({ memberId, dayTypeNames, initialSchedule }: Props) {
  // Heuristic: if there are weekly entries, default to 'weekly' mode; else 'daily'
  const initialMode = initialSchedule.weeklyPattern.length > 0 ? 'weekly' : 'daily';
  const [mode, setMode] = useState<'daily' | 'weekly'>(initialMode);

  const [weekly, setWeekly] = useState<Record<DayOfWeek, string>>(() => {
    const map = {} as Record<DayOfWeek, string>;
    for (const d of DAY_VALUES) {
      map[d] = initialSchedule.weeklyPattern.find((w) => w.dayOfWeek === d)?.dayTypeName ?? NONE;
    }
    return map;
  });
  const [iterate, setIterate] = useState(initialSchedule.iterate);
  const [overrides, setOverrides] = useState<ICalendarOverride[]>(initialSchedule.calendarOverrides);
  const [newDate, setNewDate] = useState('');
  const [newDayType, setNewDayType] = useState(dayTypeNames[0] ?? '');
  const [saving, setSaving] = useState(false);

  function addOverride(): void {
    if (!newDate || !newDayType) return;
    setOverrides((list) =>
      [...list, { date: newDate, dayTypeName: newDayType }].sort((a, b) => a.date.localeCompare(b.date)),
    );
    setNewDate('');
  }

  function removeOverride(date: string): void {
    setOverrides((list) => list.filter((o) => o.date !== date));
  }

  async function save(): Promise<void> {
    setSaving(true);
    let weeklyPattern: IWeeklyPatternEntry[];
    let calendarOverrides: ICalendarOverride[];
    if (mode === 'weekly') {
      weeklyPattern = DAY_VALUES.filter((d) => weekly[d] !== NONE).map((d) => ({
        dayOfWeek: d,
        dayTypeName: weekly[d],
      }));
      calendarOverrides = overrides;
    } else {
      // Daily mode: weekly pattern is empty, all dates are explicit overrides
      weeklyPattern = [];
      calendarOverrides = overrides;
    }
    await fetch(`/api/members/${memberId}/nutrition/schedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeklyPattern, calendarOverrides, iterate }),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'daily' | 'weekly')}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="weekly">Weekly Pattern</TabsTrigger>
          <TabsTrigger value="daily">Date Overrides Only</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-4 space-y-4">
          {/* One row per day */}
          <div className="space-y-2">
            {DAY_VALUES.map((d) => (
              <div key={d} className="flex items-center gap-3">
                <span className="w-9 shrink-0 text-[12px] font-medium text-foreground/50">
                  {DAY_LABELS[d]}
                </span>
                <Select
                  value={weekly[d]}
                  onValueChange={(v) => setWeekly((w) => ({ ...w, [d]: v ?? NONE }))}
                >
                  <SelectTrigger className="h-9 flex-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Not set —</SelectItem>
                    {dayTypeNames.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer text-foreground/80">
            <input
              type="checkbox"
              checked={iterate}
              onChange={(e) => setIterate(e.target.checked)}
              aria-label="Iterate weekly"
              className="rounded"
            />
            Auto-roll to subsequent weeks
          </label>
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <p className="text-sm text-foreground/50">
            No repeating pattern — use the date overrides below to schedule specific days.
          </p>
        </TabsContent>
      </Tabs>

      {/* Calendar overrides */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
          {mode === 'daily' ? 'Scheduled Dates' : 'Date Overrides'}
        </div>

        {overrides.length > 0 && (
          <div className="space-y-1.5">
            {overrides.map((o) => (
              <div key={o.date} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <span className="text-foreground/60 font-medium tabular-nums">{o.date}</span>
                <span className="text-foreground/30 mx-0.5">→</span>
                <span className="text-foreground/80 flex-1">{o.dayTypeName}</span>
                <button
                  type="button"
                  onClick={() => removeOverride(o.date)}
                  className="text-foreground/30 hover:text-destructive transition-colors ml-auto"
                  aria-label={`Remove override for ${o.date}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {overrides.length === 0 && (
          <p className="text-sm text-foreground/35">No date overrides set.</p>
        )}

        {/* Add new override */}
        <div className="flex gap-2 pt-1">
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <Select value={newDayType} onValueChange={(v) => setNewDayType(v ?? '')}>
            <SelectTrigger className="flex-1 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dayTypeNames.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={addOverride}
            disabled={!newDate || !newDayType}
            size="sm"
            className="h-9 px-4"
          >
            Add
          </Button>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? 'Saving…' : 'Save Schedule'}
      </Button>
    </div>
  );
}

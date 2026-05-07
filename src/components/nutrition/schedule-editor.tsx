'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'daily' | 'weekly')}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="weekly">Weekly Pattern</TabsTrigger>
          <TabsTrigger value="daily">Daily (Calendar)</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card className="p-3 space-y-3">
            <div className="grid grid-cols-7 gap-2">
              {DAY_VALUES.map((d) => (
                <div key={d}>
                  <div className="text-xs text-foreground/65">{DAY_LABELS[d]}</div>
                  <Select
                    value={weekly[d]}
                    onValueChange={(v) => setWeekly((w) => ({ ...w, [d]: v ?? NONE }))}
                  >
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {dayTypeNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={iterate}
                onChange={(e) => setIterate(e.target.checked)}
                aria-label="Iterate weekly"
              />
              <span>Iterate weekly (auto-roll to subsequent weeks)</span>
            </label>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card className="p-3 text-sm text-muted-foreground">
            Pick a day type for specific dates. Leave gaps for unscheduled days.
          </Card>
        </TabsContent>
      </Tabs>

      {/* Calendar overrides — visible in both modes; in 'daily' mode it IS the full schedule */}
      <Card className="p-3 space-y-3">
        <h3 className="text-sm font-medium">
          {mode === 'daily' ? 'Scheduled Dates' : 'Calendar Overrides'}
        </h3>
        <ul className="divide-y">
          {overrides.length === 0 && (
            <li className="py-2 text-xs text-muted-foreground">No dates scheduled</li>
          )}
          {overrides.map((o) => (
            <li key={o.date} className="py-1.5 flex justify-between items-center text-sm">
              <span>{o.date}</span>
              <span>{o.dayTypeName}</span>
              <Button variant="ghost" size="sm" onClick={() => removeOverride(o.date)}>
                ×
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 items-end">
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-40"
          />
          <Select value={newDayType} onValueChange={(v) => setNewDayType(v ?? '')}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {dayTypeNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={addOverride} disabled={!newDate || !newDayType}>
            + Add
          </Button>
        </div>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Schedule'}
      </Button>
    </div>
  );
}

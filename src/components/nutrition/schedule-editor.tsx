'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ISchedule, IWeeklyPatternEntry, ICalendarOverride } from '@/lib/db/models/member-nutrition-plan.model';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
type DayOfWeek = (typeof DAY_VALUES)[number];

interface Props {
  memberId: string;
  dayTypeNames: string[];
  initialSchedule: ISchedule;
}

const NONE = '__none__';

export function ScheduleEditor({ memberId, dayTypeNames, initialSchedule }: Props) {
  const [weekly, setWeekly] = useState<Record<DayOfWeek, string>>(() => {
    const map = {} as Record<DayOfWeek, string>;
    for (const d of DAY_VALUES) {
      map[d] = initialSchedule.weeklyPattern.find((w) => w.dayOfWeek === d)?.dayTypeName ?? NONE;
    }
    return map;
  });
  const [overrides, setOverrides] = useState<ICalendarOverride[]>(initialSchedule.calendarOverrides);
  const [newDate, setNewDate] = useState('');
  const [newDayType, setNewDayType] = useState(dayTypeNames[0] ?? '');
  const [saving, setSaving] = useState(false);

  function addOverride(): void {
    if (!newDate || !newDayType) return;
    setOverrides((list) => [...list, { date: newDate, dayTypeName: newDayType }]);
    setNewDate('');
  }

  function removeOverride(date: string): void {
    setOverrides((list) => list.filter((o) => o.date !== date));
  }

  async function save(): Promise<void> {
    setSaving(true);
    const weeklyPattern: IWeeklyPatternEntry[] = DAY_VALUES
      .filter((d) => weekly[d] !== NONE)
      .map((d) => ({ dayOfWeek: d, dayTypeName: weekly[d] }));
    await fetch(`/api/members/${memberId}/nutrition/schedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeklyPattern, calendarOverrides: overrides }),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <Card className="p-3 space-y-3">
        <h3 className="text-sm font-medium">Weekly Pattern</h3>
        <div className="grid grid-cols-7 gap-2">
          {DAY_VALUES.map((d) => (
            <div key={d}>
              <div className="text-xs text-muted-foreground">{DAY_LABELS[d]}</div>
              <Select
                value={weekly[d]}
                onValueChange={(v) => setWeekly((w) => ({ ...w, [d]: v }))}
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
      </Card>

      <Card className="p-3 space-y-3">
        <h3 className="text-sm font-medium">Calendar Overrides</h3>
        <ul className="divide-y">
          {overrides.map((o) => (
            <li key={o.date} className="py-1.5 flex justify-between items-center text-sm">
              <span>{o.date}</span>
              <span>{o.dayTypeName}</span>
              <Button variant="ghost" size="sm" onClick={() => removeOverride(o.date)}>×</Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 items-end">
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-40" />
          <Select value={newDayType} onValueChange={setNewDayType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {dayTypeNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={addOverride}>+ Add Override</Button>
        </div>
      </Card>

      <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Schedule'}</Button>
    </div>
  );
}

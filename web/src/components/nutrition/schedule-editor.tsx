'use client';

import { useReducer, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ISchedule, IWeeklyPatternEntry, ICalendarOverride } from '@/lib/db/models/member-nutrition-plan.model';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
type DayOfWeek = (typeof DAY_VALUES)[number];

const NONE = '__none__';

interface Props {
  memberId?: string;
  dayTypeNames: string[];
  initialSchedule: ISchedule;
  onSave?: (schedule: ISchedule) => void;
  mode?: 'edit' | 'create';
}

interface ScheduleEditorState {
  weekly: Record<DayOfWeek, string>;
  iterate: boolean;
  overrides: ICalendarOverride[];
  newDate: string;
  newDayType: string;
  saving: boolean;
}

type ScheduleEditorAction =
  | { type: 'SET_WEEKLY'; value: Record<DayOfWeek, string> }
  | { type: 'SET_ITERATE'; value: boolean }
  | { type: 'SET_OVERRIDES'; value: ICalendarOverride[] }
  | { type: 'SET_NEW_DATE'; value: string }
  | { type: 'SET_NEW_DAY_TYPE'; value: string }
  | { type: 'SET_SAVING'; value: boolean };

function scheduleEditorReducer(state: ScheduleEditorState, action: ScheduleEditorAction): ScheduleEditorState {
  switch (action.type) {
    case 'SET_WEEKLY': return { ...state, weekly: action.value };
    case 'SET_ITERATE': return { ...state, iterate: action.value };
    case 'SET_OVERRIDES': return { ...state, overrides: action.value };
    case 'SET_NEW_DATE': return { ...state, newDate: action.value };
    case 'SET_NEW_DAY_TYPE': return { ...state, newDayType: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    default: return state;
  }
}

export function ScheduleEditor({ memberId, dayTypeNames, initialSchedule, onSave, mode = 'edit' }: Props) {
  const [state, dispatch] = useReducer(scheduleEditorReducer, undefined, () => {
    const patternMap = new Map(initialSchedule.weeklyPattern.map((w) => [w.dayOfWeek, w.dayTypeName]));
    const map = {} as Record<DayOfWeek, string>;
    for (const d of DAY_VALUES) {
      map[d] = patternMap.get(d) ?? NONE;
    }
    return {
      weekly: map,
      iterate: initialSchedule.iterate,
      overrides: initialSchedule.calendarOverrides,
      newDate: '',
      newDayType: dayTypeNames[0] ?? '',
      saving: false,
    };
  });
  const { weekly, iterate, overrides, newDate, newDayType, saving } = state;

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  function addOverride(): void {
    if (!newDate || !newDayType) return;
    if (newDate < minDate) return; // reject today and past dates
    dispatch({ type: 'SET_OVERRIDES', value: [...overrides, { date: newDate, dayTypeName: newDayType }].sort((a, b) => a.date.localeCompare(b.date)) });
    dispatch({ type: 'SET_NEW_DATE', value: '' });
  }

  function removeOverride(date: string): void {
    dispatch({ type: 'SET_OVERRIDES', value: overrides.filter((o) => o.date !== date) });
  }

  async function save(): Promise<void> {
    dispatch({ type: 'SET_SAVING', value: true });
    const weeklyPattern: IWeeklyPatternEntry[] = DAY_VALUES.flatMap((d) =>
      weekly[d] !== NONE ? [{ dayOfWeek: d, dayTypeName: weekly[d] }] : [],
    );
    const builtSchedule: ISchedule = { weeklyPattern, calendarOverrides: overrides, iterate };

    if (mode === 'edit') {
      await fetch(`/api/members/${memberId}/nutrition/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(builtSchedule),
      });
    }

    dispatch({ type: 'SET_SAVING', value: false });
    onSave?.(builtSchedule);
  }

  return (
    <div className="space-y-6">
      {/* Weekly pattern */}
      <div className="space-y-2">
        {DAY_VALUES.map((d) => (
          <div key={d} className="flex items-center gap-3">
            <span className="w-9 shrink-0 text-[12px] font-medium text-foreground/50">
              {DAY_LABELS[d]}
            </span>
            <Select
              value={weekly[d]}
              onValueChange={(v) => dispatch({ type: 'SET_WEEKLY', value: { ...weekly, [d]: v ?? NONE } })}
            >
              <SelectTrigger className="h-9 flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not set</SelectItem>
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
          onChange={(e) => dispatch({ type: 'SET_ITERATE', value: e.target.checked })}
          aria-label="Iterate weekly"
          className="rounded"
        />
        Auto-roll to subsequent weeks
      </label>

      {/* Date overrides */}
      <div className="space-y-3 border-t border-foreground/8 pt-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
          Date Overrides
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
                  className="text-foreground/30 hover:text-destructive transition-colors"
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

        <div className="flex gap-2">
          <Input
            type="date"
            value={newDate}
            min={minDate}
            onChange={(e) => dispatch({ type: 'SET_NEW_DATE', value: e.target.value })}
            className="flex-1 h-9 text-sm"
          />
          <Select value={newDayType} onValueChange={(v) => dispatch({ type: 'SET_NEW_DAY_TYPE', value: v ?? '' })}>
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

'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/shared/section-header';
import type { ICheckInConfig } from '@/lib/db/models/check-in-config.model';
import { upsertCheckInConfigAction } from '../actions';

interface Props {
  memberId: string;
  initialConfig: ICheckInConfig | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function CheckInScheduleForm({ memberId, initialConfig }: Props) {
  const [dayOfWeek, setDayOfWeek] = useState(initialConfig?.dayOfWeek ?? 4);
  const [hour, setHour] = useState(initialConfig?.hour ?? 7);
  const [active, setActive] = useState(initialConfig?.active ?? true);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertCheckInConfigAction(memberId, { dayOfWeek, hour, minute: 0, active });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Schedule saved');
      }
    });
  }

  return (
    <section className="px-4 sm:px-8">
      <SectionHeader title="Weekly Reminder" />
      <form
        onSubmit={handleSubmit}
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
            className="accent-emerald-500 size-3.5"
          />
          Active
        </label>
        <Button
          type="submit"
          disabled={isPending}
          size="sm"
          className="text-xs font-semibold sm:ml-auto"
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </section>
  );
}

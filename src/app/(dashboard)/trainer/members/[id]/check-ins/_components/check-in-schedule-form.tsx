'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
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
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    startTransition(async () => {
      const result = await upsertCheckInConfigAction(memberId, { dayOfWeek, hour, minute: 0, active });
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <section>
      <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
        Weekly Check-In Schedule
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-[12px] text-[#666]">Day</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-[13px] text-white"
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-[#666]">Hour</label>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-[13px] text-white"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{pad(h)}:00</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#888]">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="accent-white"
              />
              Active
            </label>
          </div>
        </div>
        {error && <p className="text-[13px] text-red-400">{error}</p>}
        {saved && <p className="text-[13px] text-green-400">Schedule saved.</p>}
        <Button
          type="submit"
          disabled={isPending}
          className="bg-white font-semibold text-black hover:bg-white/90 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Schedule'}
        </Button>
      </form>
    </section>
  );
}

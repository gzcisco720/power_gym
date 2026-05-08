'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface ActiveLog {
  _id: string;
  dayName: string;
  startedAt: string;
}

interface Props {
  basePath: '/owner/my-training' | '/trainer/my-training';
}

export function StartWorkoutCard({ basePath }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me/workout-logs/active')
      .then((r) => r.json())
      .then((d: ActiveLog | null) => {
        if (!cancelled) {
          setActive(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function startFreestyle() {
    setCreating(true);
    const res = await fetch('/api/me/workout-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayName: 'Freestyle', plannedSets: [] }),
    });
    if (res.ok) {
      const log = (await res.json()) as { _id: string };
      router.push(`${basePath}/session/${log._id}`);
    } else {
      setCreating(false);
    }
  }

  function openTemplatePicker() {
    // TODO: open TemplateDayPickerDialog in Task 7.2
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
        Today
      </div>
      {loading ? (
        <div className="text-xs text-foreground/65">Loading…</div>
      ) : active ? (
        <Button
          onClick={() => router.push(`${basePath}/session/${active._id}`)}
          className="w-full"
        >
          Continue: {active.dayName}
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button onClick={openTemplatePicker} variant="default" className="flex-1">
            From Template
          </Button>
          <Button
            onClick={startFreestyle}
            disabled={creating}
            variant="outline"
            className="flex-1"
          >
            Freestyle
          </Button>
        </div>
      )}
    </div>
  );
}

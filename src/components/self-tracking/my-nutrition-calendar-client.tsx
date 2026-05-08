'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SelfNutritionCalendar, type NutritionDayEntry } from './self-nutrition-calendar';
import { SelfNutritionDayView } from './self-nutrition-day-view';

interface RawLog {
  date: string;
  dayLabel: string;
  meals: { items: { kcal: number }[] }[];
}

interface Props {
  backHref: string;
  mainHref: string;
}

export function MyNutritionCalendarClient({ backHref, mainHref }: Props) {
  const router = useRouter();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<NutritionDayEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/nutrition-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((logs: RawLog[]) => {
        if (cancelled) return;
        setEntries(
          logs.map((l) => ({
            date: l.date,
            dayLabel: l.dayLabel,
            kcal: l.meals.flatMap((m) => m.items).reduce((s, it) => s + it.kcal, 0),
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Nutrition Calendar"
        actions={
          <Link
            href={backHref}
            className="text-[11px] text-foreground/65 hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full space-y-4">
        <SelfNutritionCalendar
          entries={entries}
          onSelect={(e) => {
            if (e.date === today) {
              router.push(mainHref);
            } else {
              setSelectedDate(e.date);
            }
          }}
          selectedDate={selectedDate ?? undefined}
          onMonthChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
        {selectedDate && <SelfNutritionDayView initialDate={selectedDate} readOnly />}
      </div>
    </div>
  );
}

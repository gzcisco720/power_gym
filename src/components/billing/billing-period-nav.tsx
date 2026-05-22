'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface BillingPeriod {
  from: Date;
  to: Date;
  label: string;
}

function getMonthPeriod(year: number, month: number): BillingPeriod {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const label = from.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  return { from, to, label };
}

interface BillingPeriodNavProps {
  onChange: (period: BillingPeriod) => void;
}

export function BillingPeriodNav({ onChange }: BillingPeriodNavProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const period = getMonthPeriod(year, month);

  function prev() {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onChange(getMonthPeriod(newYear, newMonth));
  }

  function next() {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onChange(getMonthPeriod(newYear, newMonth));
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={prev} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Previous month">
        <ChevronLeft className="h-4 w-4 text-foreground/65" />
      </button>
      <span className="text-sm font-medium text-foreground min-w-[100px] text-center">{period.label}</span>
      <button onClick={next} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Next month">
        <ChevronRight className="h-4 w-4 text-foreground/65" />
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface PlanDayType {
  name: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  loggedKcal: number;
  loggedProtein: number;
  loggedCarbs: number;
  loggedFat: number;
  planDayTypes: PlanDayType[];
}

function fmt(n: number, unit = 'g'): string {
  if (n > 0) return `+${n}${unit}`;
  if (n < 0) return `−${Math.abs(n)}${unit}`;
  return `0${unit}`;
}

export function NutritionPlanCompareDialog({
  open,
  onOpenChange,
  date,
  loggedKcal,
  loggedProtein,
  loggedCarbs,
  loggedFat,
  planDayTypes,
}: Props) {
  const [selected, setSelected] = useState<PlanDayType | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Day Complete 🎉</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-foreground/65">
          {date} · {loggedKcal} kcal logged
        </p>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-foreground/65">
            Compare with plan day
          </p>
          <div className="flex flex-wrap gap-2">
            {planDayTypes.map((dt) => (
              <button
                key={dt.name}
                type="button"
                onClick={() => setSelected(dt)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                  selected?.name === dt.name
                    ? 'bg-primary/15 border-primary/50 text-primary-light'
                    : 'border-foreground/15 text-foreground/50 hover:border-foreground/30'
                }`}
              >
                {dt.name}
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/65">Plan target</span>
              <span className="text-[10px] font-semibold text-primary-light bg-primary/10 rounded-full px-2 py-0.5">
                {selected.name}
              </span>
            </div>
            <CompareRow
              label="kcal"
              logged={loggedKcal}
              target={selected.targetKcal}
              unit=""
              color="text-foreground"
            />
            <CompareRow
              label="Protein"
              logged={loggedProtein}
              target={selected.targetProtein}
              color="text-emerald-400"
            />
            <CompareRow
              label="Carbs"
              logged={loggedCarbs}
              target={selected.targetCarbs}
              color="text-amber-400"
            />
            <CompareRow
              label="Fat"
              logged={loggedFat}
              target={selected.targetFat}
              color="text-pink-400"
            />
          </div>
        )}

        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function CompareRow({
  label,
  logged,
  target,
  unit = 'g',
  color,
}: {
  label: string;
  logged: number;
  target: number;
  unit?: string;
  color: string;
}) {
  const diff = logged - target;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={`text-xs font-semibold ${color}`}>{label}</span>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-foreground font-semibold">
          {logged}
          {unit}
        </span>
        <span className="text-foreground/35">
          / {target}
          {unit}
        </span>
        <span className={diff > 0 ? 'text-destructive' : diff < 0 ? 'text-foreground/65' : 'text-emerald-400'}>
          {fmt(diff, unit)}
        </span>
      </div>
    </div>
  );
}

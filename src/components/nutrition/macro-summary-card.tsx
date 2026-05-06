'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { MacroRing } from './macro-ring';
import type { MacroSnapshot } from '@/lib/nutrition/macros';

interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Props {
  actuals: MacroSnapshot;
  targets: Targets;
}

export function MacroSummaryCard({ actuals, targets }: Props) {
  const [page, setPage] = useState<0 | 1>(0);
  return (
    <Card className="p-3 space-y-3">
      {page === 0 ? (
        <CorePage actuals={actuals} targets={targets} />
      ) : (
        <ExtendedPage actuals={actuals} />
      )}
      <div className="flex justify-center gap-1.5">
        <button
          aria-label="Core macros"
          onClick={() => setPage(0)}
          className={`w-2 h-2 rounded-full ${page === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
        />
        <button
          aria-label="Extended macros"
          onClick={() => setPage(1)}
          className={`w-2 h-2 rounded-full ${page === 1 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
        />
      </div>
    </Card>
  );
}

function CorePage({ actuals, targets }: Props) {
  return (
    <div className="flex justify-between items-center">
      <div className="space-y-1 text-sm">
        <Row label="Kcal" actual={actuals.kcal} target={targets.kcal} unit="kcal" color="text-blue-400" />
        <Row label="Protein" actual={actuals.protein} target={targets.protein} unit="g" color="text-emerald-400" />
        <Row label="Carbs" actual={actuals.carbs} target={targets.carbs} unit="g" color="text-amber-400" />
        <Row label="Fat" actual={actuals.fat} target={targets.fat} unit="g" color="text-pink-400" />
      </div>
      <MacroRing
        values={{
          kcal: { actual: actuals.kcal, target: targets.kcal },
          protein: { actual: actuals.protein, target: targets.protein },
          carbs: { actual: actuals.carbs, target: targets.carbs },
          fat: { actual: actuals.fat, target: targets.fat },
        }}
      />
    </div>
  );
}

interface RowProps {
  label: string;
  actual: number;
  target: number;
  unit: string;
  color: string;
}

function Row({ label, actual, target, unit, color }: RowProps) {
  return (
    <div>
      <span className="text-muted-foreground w-16 inline-block">{label}</span>
      <span className={color}>
        {actual.toFixed(actual >= 100 ? 0 : 1)}/{target.toFixed(0)}
        {unit}
      </span>
    </div>
  );
}

function ExtendedPage({ actuals }: { actuals: MacroSnapshot }) {
  const fields: Array<[string, number | undefined, string]> = [
    ['Fiber', actuals.fiber, 'g'],
    ['Polyunsat', actuals.polyunsaturated, 'g'],
    ['Sugar', actuals.sugar, 'g'],
    ['Monounsat', actuals.monounsaturated, 'g'],
    ['Polyols', actuals.polyols, 'g'],
    ['Saturated', actuals.saturated, 'g'],
    ['Salt', actuals.salt, 'g'],
    ['Sodium', actuals.sodium, 'mg'],
  ];
  return (
    <div className="grid grid-cols-2 gap-y-1 gap-x-6 text-sm">
      {fields.map(([label, val, unit]) => (
        <div key={label}>
          <span className="text-muted-foreground w-24 inline-block">{label}</span>
          <span>{val !== undefined ? `${val.toFixed(1)} ${unit}` : '—'}</span>
        </div>
      ))}
    </div>
  );
}

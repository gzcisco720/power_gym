'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { MacroRing } from './macro-ring';
import type { MacroSnapshot } from '@/lib/nutrition/macros';

interface Props {
  macros: MacroSnapshot;
}

export function MacroSummaryCard({ macros }: Props) {
  const [page, setPage] = useState<0 | 1>(0);
  return (
    <Card className="p-3 space-y-3">
      {page === 0 ? <CorePage macros={macros} /> : <ExtendedPage macros={macros} />}
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

function CorePage({ macros }: Props) {
  return (
    <div className="flex justify-between items-center">
      <div className="space-y-1 text-sm">
        <Row label="Kcal" value={macros.kcal} unit="kcal" color="text-blue-400" />
        <Row label="Protein" value={macros.protein} unit="g" color="text-emerald-400" />
        <Row label="Carbs" value={macros.carbs} unit="g" color="text-amber-400" />
        <Row label="Fat" value={macros.fat} unit="g" color="text-pink-400" />
      </div>
      <MacroRing protein={macros.protein} carbs={macros.carbs} fat={macros.fat} />
    </div>
  );
}

function Row({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div>
      <span className="text-muted-foreground w-16 inline-block">{label}</span>
      <span className={color}>
        {value.toFixed(value >= 100 ? 0 : 1)}
        {unit}
      </span>
    </div>
  );
}

function ExtendedPage({ macros }: Props) {
  const fields: Array<[string, number | undefined, string]> = [
    ['Fiber', macros.fiber, 'g'],
    ['Polyunsat', macros.polyunsaturated, 'g'],
    ['Sugar', macros.sugar, 'g'],
    ['Monounsat', macros.monounsaturated, 'g'],
    ['Polyols', macros.polyols, 'g'],
    ['Saturated', macros.saturated, 'g'],
    ['Salt', macros.salt, 'g'],
    ['Sodium', macros.sodium, 'mg'],
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

import { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MacroRing } from './macro-ring';
import type { MacroSnapshot } from '@/lib/nutrition/macros';

interface Props {
  macros: MacroSnapshot;
}

const PAGES = [0, 1] as const;
type PageIndex = (typeof PAGES)[number];

const PAGE_LABELS: Record<PageIndex, string> = {
  0: 'Macros',
  1: 'Detail',
};

export function MacroSummaryCard({ macros }: Props) {
  const [page, setPage] = useState<PageIndex>(0);
  const touchStartX = useRef<number | null>(null);

  const toggle = (): void => setPage((p) => (p === 0 ? 1 : 0));

  return (
    <Card
      className="p-4 space-y-3 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          toggle();
        }
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) >= 40) toggle();
      }}
    >
      <div className="min-h-32 flex flex-col justify-center">
        {page === 0 ? <CorePage macros={macros} /> : <ExtendedPage macros={macros} />}
      </div>
      <div className="flex justify-center gap-1">
        {PAGES.map((p) => (
          <button
            key={p}
            type="button"
            aria-label={p === 0 ? 'Core macros' : 'Extended macros'}
            aria-current={page === p ? 'true' : undefined}
            onClick={() => setPage(p)}
            className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full cursor-pointer transition-colors ${
              page === p
                ? 'bg-primary/15 text-primary'
                : 'text-foreground/65 hover:text-foreground hover:bg-muted'
            }`}
          >
            {PAGE_LABELS[p]}
          </button>
        ))}
      </div>
    </Card>
  );
}

function CorePage({ macros }: Props) {
  const proteinKcal = macros.protein * 4;
  const carbsKcal = macros.carbs * 4;
  const fatKcal = macros.fat * 9;
  const computed = proteinKcal + carbsKcal + fatKcal;
  const denom = computed > 0 ? computed : 1;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <MacroRing protein={macros.protein} carbs={macros.carbs} fat={macros.fat} size={104} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold tabular-nums leading-none">
            {macros.kcal.toFixed(0)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-foreground/65 mt-0.5">
            kcal
          </span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        <MacroBar
          label="Protein"
          value={macros.protein}
          percent={(proteinKcal / denom) * 100}
          colorClass="bg-emerald-400"
          textClass="text-emerald-400"
        />
        <MacroBar
          label="Carbs"
          value={macros.carbs}
          percent={(carbsKcal / denom) * 100}
          colorClass="bg-amber-400"
          textClass="text-amber-400"
        />
        <MacroBar
          label="Fat"
          value={macros.fat}
          percent={(fatKcal / denom) * 100}
          colorClass="bg-pink-400"
          textClass="text-pink-400"
        />
      </div>
    </div>
  );
}

interface MacroBarProps {
  label: string;
  value: number;
  percent: number;
  colorClass: string;
  textClass: string;
}

function MacroBar({ label, value, percent, colorClass, textClass }: MacroBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-foreground/65 font-medium">{label}</span>
        <span className="tabular-nums">
          <span className={`font-semibold ${textClass}`}>
            {value.toFixed(value >= 100 ? 0 : 1)}
          </span>
          <span className="text-foreground/65"> g</span>
          <span className="text-foreground/65 ml-2">{percent.toFixed(0)}%</span>
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

type ExtRow = [label: string, value: number | undefined, unit: string];

function ExtendedPage({ macros }: Props) {
  const left: ExtRow[] = [
    ['Fiber', macros.fiber, 'g'],
    ['Sugar', macros.sugar, 'g'],
    ['Polyols', macros.polyols, 'g'],
    ['Salt', macros.salt, 'g'],
  ];
  const right: ExtRow[] = [
    ['Polyunsaturated', macros.polyunsaturated, 'g'],
    ['Monounsaturated', macros.monounsaturated, 'g'],
    ['Saturated', macros.saturated, 'g'],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
      <div className="space-y-2">
        {left.map((r) => (
          <ExtendedRow key={r[0]} row={r} />
        ))}
      </div>
      <div className="space-y-2">
        {right.map((r) => (
          <ExtendedRow key={r[0]} row={r} />
        ))}
      </div>
    </div>
  );
}

function ExtendedRow({ row }: { row: ExtRow }) {
  const [label, val, unit] = row;
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-foreground/65">{label}</span>
      <span>
        {val !== undefined ? `${val.toFixed(val >= 100 ? 0 : 1)} ${unit}` : '—'}
      </span>
    </div>
  );
}

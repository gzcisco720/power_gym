// src/app/(dashboard)/member/journey/_components/journey-header.tsx
import type { JourneySummary } from '@/lib/types/journey';

interface Props {
  summary: JourneySummary;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
}

function formatDelta(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}`;
}

export default function JourneyHeader({ summary }: Props) {
  const hasComparison = summary.totalTests >= 2;
  const bfDelta = hasComparison
    ? Math.round((summary.latestBodyFatPct - summary.firstBodyFatPct) * 10) / 10
    : null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/[0.03] p-4 shadow-[0_4px_24px_rgba(99,102,241,0.1)]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="text-foreground text-xl font-bold leading-tight">我的旅程</h1>
          <p className="text-foreground/65 text-xs mt-0.5">
            {summary.totalTests} 次体测 · 开始于 {formatDate(summary.firstTestDate)}
          </p>
        </div>
        {bfDelta !== null && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            bfDelta < 0
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-destructive/10 text-destructive'
          }`}>
            {bfDelta < 0 ? '↓' : '↑'} {Math.abs(bfDelta)}% 体脂
          </span>
        )}
      </div>

      {hasComparison && (
        <div className="flex gap-0 border-t border-primary/15 pt-3">
          <div className="flex-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/65 mb-1">起点</p>
            <p className="text-foreground text-sm font-bold">{summary.firstBodyFatPct}%</p>
            <p className="text-foreground/65 text-[10px]">
              {summary.firstWeight} kg · {formatDate(summary.firstTestDate)}
            </p>
          </div>
          <div className="flex-1 border-l border-primary/15 pl-3 ml-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/65 mb-1">现在</p>
            <p className="text-primary-light text-sm font-bold">{summary.latestBodyFatPct}%</p>
            <p className="text-foreground/65 text-[10px]">{summary.latestWeight} kg</p>
          </div>
          <div className="flex-1 border-l border-primary/15 pl-3 ml-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/65 mb-1">瘦体质量</p>
            <p className={`text-sm font-bold ${summary.leanMassDeltaKg >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
              {formatDelta(summary.leanMassDeltaKg)} kg
            </p>
            <p className="text-foreground/65 text-[10px]">
              {summary.firstLeanMassKg.toFixed(1)} → {summary.latestLeanMassKg.toFixed(1)} kg
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

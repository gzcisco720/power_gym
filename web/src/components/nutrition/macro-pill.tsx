import { cn } from '@/lib/utils';

export type MacroTone = 'emerald' | 'amber' | 'pink';

const TONE_STYLES: Record<MacroTone, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-300',
  pink: 'bg-pink-500/15 text-pink-300',
};

interface MacroPillProps {
  value: number;
  label: string;
  tone: MacroTone;
  className?: string;
}

export function MacroPill({ value, label, tone, className }: MacroPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline px-1.5 py-0.5 rounded font-semibold tabular-nums',
        TONE_STYLES[tone],
        className,
      )}
    >
      {value.toFixed(0)}
      <span className="opacity-70 font-normal ml-0.5">{label}</span>
    </span>
  );
}

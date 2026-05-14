'use client';

import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  accentColor?: 'primary' | 'success' | 'achievement';
}

const accentMap = {
  primary:     'bg-primary/10 ring-primary/20',
  success:     'bg-emerald-500/10 ring-emerald-500/20',
  achievement: 'bg-amber-500/10 ring-amber-500/20',
} as const;

export function StatCard({ label, value, unit, delta, accentColor }: StatCardProps) {
  const surfaceClass = accentColor
    ? accentMap[accentColor]
    : 'bg-white/[.04] ring-white/10';

  return (
    <div className={`rounded-xl ring-1 backdrop-blur-sm p-4 ${surfaceClass}`}>
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
        {label}
      </div>
      <motion.div
        className="mt-2 text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums"
        variants={variants.scaleIn}
        initial="hidden"
        animate="visible"
      >
        {value}
        {unit && (
          <span className="ml-1 text-sm font-medium text-foreground/65">{unit}</span>
        )}
      </motion.div>
      {delta && (
        <div className="mt-1.5 text-xs text-foreground/65">{delta}</div>
      )}
    </div>
  );
}

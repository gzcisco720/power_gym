'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const shouldReduce = useReducedMotion();
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="h-[3px] w-full overflow-hidden rounded-full bg-[#141414]"
    >
      <motion.div
        className="h-full rounded-full bg-white"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: shouldReduce ? 0 : 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}

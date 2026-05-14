'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface BodyTestImprovementAnimationProps {
  metricLabel: string;
  previousValue: string;
  currentValue: string;
  diffLabel: string;
  onComplete?: () => void;
}

export function BodyTestImprovementAnimation({
  metricLabel, previousValue, currentValue, diffLabel, onComplete,
}: BodyTestImprovementAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 1800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-xs text-foreground/50">{metricLabel}</div>
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="text-foreground/40">{previousValue}</span>
          <span className="text-foreground/40">→</span>
          <span className="text-emerald-400">{currentValue}</span>
        </div>
        <div className="text-xs text-emerald-400 font-bold">{diffLabel}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="text-[9px] uppercase tracking-widest text-foreground/40">{metricLabel}</div>
      <div className="flex items-center gap-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div className="text-xl font-bold tracking-tight text-foreground/30">{previousValue}</div>
          <div className="text-[8px] uppercase tracking-wide text-foreground/25 mt-0.5">before</div>
        </motion.div>
        <motion.div
          className="text-emerald-400 text-xl"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 18 }}
        >
          →
        </motion.div>
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.35 }}
        >
          <div className="text-xl font-bold tracking-tight text-emerald-400">{currentValue}</div>
          <div className="text-[8px] uppercase tracking-wide text-foreground/25 mt-0.5">today</div>
        </motion.div>
      </div>
      <motion.div
        className="bg-emerald-500/12 border border-emerald-500/25 rounded-lg px-4 py-2 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="text-sm font-bold text-emerald-400">{diffLabel}</div>
      </motion.div>
    </div>
  );
}

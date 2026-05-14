'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface NewPRAnimationProps {
  exerciseName: string;
  weightKg: number;
  previousKg?: number;
  onComplete?: () => void;
}

export function NewPRAnimation({ exerciseName, weightKg, previousKg, onComplete }: NewPRAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-3xl">🏆</div>
        <div className="text-base font-bold text-amber-400">New PR — {weightKg} kg!</div>
        <div className="text-xs text-foreground/50">{exerciseName}</div>
      </div>
    );
  }

  const prevPct = previousKg ? Math.round((previousKg / weightKg) * 85) : 70;

  return (
    <div className="flex flex-col items-center gap-4 py-4 px-2">
      <div className="w-full space-y-2">
        <div className="text-[9px] uppercase tracking-widest text-foreground/40">{exerciseName} · 1RM Estimate</div>
        {previousKg && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[5px] bg-white/[.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-white/30"
                initial={{ width: 0 }}
                animate={{ width: `${prevPct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="text-[10px] text-foreground/30 min-w-[48px] text-right">{previousKg} kg</div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-[5px] bg-white/[.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="text-[10px] text-amber-400 font-bold min-w-[48px] text-right">{weightKg} kg ★</div>
        </div>
      </div>
      <motion.div
        className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-1.5 text-amber-400 text-sm font-bold"
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 1, type: 'spring', stiffness: 400, damping: 18 }}
      >
        🏆 New PR{previousKg ? ` +${weightKg - previousKg} kg` : ''}
      </motion.div>
    </div>
  );
}

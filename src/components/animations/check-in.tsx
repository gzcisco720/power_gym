'use client';

import { useEffect, useRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';

interface CheckInAnimationProps {
  streakDays: number;
  weekDots: boolean[];
  onComplete?: () => void;
}

export function CheckInAnimation({ streakDays, weekDots, onComplete }: CheckInAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 1600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-sm font-bold text-foreground">Checked in ✓</div>
        {streakDays > 0 && <div className="text-xs text-emerald-400">🔥 {streakDays}-day streak</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex gap-1.5">
        {weekDots.map((done, i) => {
          return (
            // oxlint-disable-next-line react-doctor/no-array-index-key, react-doctor/no-array-index-as-key
            <m.div key={i /* static 7-slot week dot array */}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                done ? 'bg-emerald-500 text-white' : 'bg-white/[.06] border border-white/10 text-foreground/20'
              }`}
              initial={{ scale: 0.6, opacity: 0.3 }}
              animate={done ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0.4 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 400, damping: 18 }}
            >
              {done ? '✓' : ''}
            </m.div>
          );
        })}
      </div>
      <m.div
        className="text-sm font-bold text-foreground"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 25 }}
      >
        Checked in ✓
      </m.div>
      {streakDays > 0 && (
        <m.div
          className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-xs font-bold text-emerald-400"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.75, type: 'spring', stiffness: 400, damping: 18 }}
        >
          🔥 {streakDays}-day streak
        </m.div>
      )}
    </div>
  );
}

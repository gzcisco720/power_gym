'use client';

import { useEffect, useRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';

interface WorkoutCompleteAnimationProps {
  onComplete?: () => void;
}

export function WorkoutCompleteAnimation({ onComplete }: WorkoutCompleteAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 1400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="text-4xl">💪</div>
        <div className="text-lg font-bold text-foreground">Workout Complete!</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative">
        <m.div
          className="absolute inset-[-12px] rounded-full bg-emerald-500/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.4, 1.2], opacity: [0, 0.6, 0] }}
          transition={{ delay: 0.9, duration: 0.6 }}
        />
        <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <m.circle
            cx="36" cy="36" r="30"
            fill="none" stroke="#10b981" strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 30}
            initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-2xl">💪</div>
      </div>
      <m.div
        className="text-lg font-bold text-foreground"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 25 }}
      >
        Workout Complete!
      </m.div>
      <m.div
        className="text-xs text-foreground/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.05 }}
      >
        Great work, keep it up
      </m.div>
    </div>
  );
}

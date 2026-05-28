'use client';

import { useEffect, useRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';

interface StreakMilestoneAnimationProps {
  days: number;
  onComplete?: () => void;
}

const BAR_COUNT = 7;

export function StreakMilestoneAnimation({ days, onComplete }: StreakMilestoneAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 1800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-1 py-4">
        <div className="text-4xl font-extrabold tracking-tighter text-amber-400">{days}</div>
        <div className="text-[10px] uppercase tracking-widest text-foreground/40">day streak</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4 relative">
      <m.div
        className="absolute right-4 top-2 text-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 300, damping: 20 }}
      >
        🔥
      </m.div>
      {/* oxlint-disable-next-line react-doctor/no-gradient-text */}
      <m.div
        className="text-5xl font-extrabold tracking-tighter bg-gradient-to-br from-amber-400 to-red-500 bg-clip-text text-transparent"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        {days}
      </m.div>
      <m.div
        className="text-[10px] uppercase tracking-[3px] text-foreground/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        day streak
      </m.div>
      <div className="flex gap-1 mt-1">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <m.div
            key={i}
            className="flex-1 w-7 h-4 rounded bg-gradient-to-b from-amber-400 to-red-500"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            style={{ transformOrigin: 'bottom' }}
            transition={{ delay: 0.35 + i * 0.06, type: 'spring', stiffness: 400, damping: 18 }}
          />
        ))}
      </div>
    </div>
  );
}

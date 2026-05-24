'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface NutritionDayCompleteAnimationProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
  onComplete?: () => void;
}

const RADIUS = [26, 20, 14] as const;
const COLORS = ['#10b981', '#f59e0b', '#ec4899'] as const;
const LABELS = ['P', 'C', 'F'] as const;

export function NutritionDayCompleteAnimation({
  proteinG, carbsG, fatG, onComplete,
}: NutritionDayCompleteAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const values = [proteinG, carbsG, fatG];

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-sm font-bold text-foreground">Day Complete ✓</div>
        <div className="flex gap-2 text-xs">
          <span className="text-emerald-400">P {proteinG}g</span>
          <span className="text-amber-400">C {carbsG}g</span>
          <span className="text-pink-400">F {fatG}g</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative w-16 h-16">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          {RADIUS.map((r, i) => {
            const circ = 2 * Math.PI * r;
            return (
              <motion.circle
                key={r}
                cx="32" cy="32" r={r}
                fill="none" stroke={COLORS[i]} strokeWidth={i === 0 ? 5 : i === 1 ? 4 : 3.5}
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ delay: i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-base">✓</div>
      </div>
      <motion.div
        className="text-sm font-bold text-foreground"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 25 }}
      >
        Day Complete
      </motion.div>
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.95 }}
      >
        {LABELS.map((lbl, i) => (
          <span
            key={lbl}
            className="text-[9px] font-bold px-2 py-0.5 rounded"
            style={{ background: `${COLORS[i]}20`, color: COLORS[i], border: `1px solid ${COLORS[i]}40` }}
          >
            {lbl} {values[i]}g
          </span>
        ))}
      </motion.div>
    </div>
  );
}

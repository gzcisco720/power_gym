'use client';

import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SetChipProps {
  setNumber: number;
  done: boolean;
  onClick?: () => void;
}

export function SetChip({ setNumber, done, onClick }: SetChipProps) {
  const shouldReduce = useReducedMotion();

  return (
    <m.button
      type="button"
      onClick={onClick}
      animate={done && !shouldReduce ? { scale: [0.8, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[8px] font-bold transition-colors',
        done
          ? 'border-primary bg-primary text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
          : 'border-white/10 bg-transparent text-foreground/35 hover:border-white/20'
      )}
      aria-label={done ? `Set ${setNumber} complete` : `Set ${setNumber}`}
    >
      {done ? '✓' : setNumber}
    </m.button>
  );
}

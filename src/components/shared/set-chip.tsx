'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SetChipProps {
  setNumber: number;
  done: boolean;
  onClick?: () => void;
}

export function SetChip({ setNumber, done, onClick }: SetChipProps) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={done && !shouldReduce ? { scale: [0.8, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[8px] font-bold transition-colors',
        done
          ? 'border-white bg-white text-black'
          : 'border-[#1e1e1e] bg-transparent text-[#555] hover:border-[#333]'
      )}
      aria-label={done ? `Set ${setNumber} complete` : `Set ${setNumber}`}
    >
      {done ? '✓' : setNumber}
    </motion.button>
  );
}

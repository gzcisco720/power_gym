'use client';

import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

interface Props {
  greeting: string;
  dateLabel: string;
}

export function MemberHeroClient({ greeting, dateLabel }: Props) {
  return (
    <motion.div initial="hidden" animate="visible" variants={variants.fadeSlideUp}>
      <h2 className="text-[20px] font-extrabold tracking-tight text-foreground">{greeting}</h2>
      <p className="text-[11px] text-foreground/40 mt-0.5">{dateLabel}</p>
    </motion.div>
  );
}

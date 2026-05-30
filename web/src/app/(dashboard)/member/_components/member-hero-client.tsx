'use client';

import { m } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

interface Props {
  greeting: string;
  dateLabel: string;
}

export function MemberHeroClient({ greeting, dateLabel }: Props) {
  return (
    <m.div initial="hidden" animate="visible" variants={variants.fadeSlideUp}>
      <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{greeting}</h2>
      <p className="text-[11px] text-foreground/65 mt-0.5">{dateLabel}</p>
    </m.div>
  );
}

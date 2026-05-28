'use client';

import { AnimatePresence, m } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

interface Props {
  activeTab: string;
  children: React.ReactNode;
}

export function SettingsTabPanel({ activeTab, children }: Props) {
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={activeTab}
        variants={variants.fadeSlideUp}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

interface Props {
  activeTab: string;
  children: React.ReactNode;
}

export function SettingsTabPanel({ activeTab, children }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        variants={variants.fadeSlideUp}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

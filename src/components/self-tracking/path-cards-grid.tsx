'use client';

import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

interface Props {
  children: React.ReactNode;
}

export function PathCardsGrid({ children }: Props) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
      variants={variants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function PathCardItem({ children }: { children: React.ReactNode }) {
  return <motion.div variants={variants.staggerItem}>{children}</motion.div>;
}

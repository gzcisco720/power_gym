'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-full overflow-x-clip">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname.split('/')[2] ?? pathname}
          initial="pageEnter"
          animate="pageVisible"
          exit="pageExit"
          variants={variants}
          className="h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

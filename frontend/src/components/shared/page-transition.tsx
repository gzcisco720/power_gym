import { useLocation } from 'react-router-dom';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <LazyMotion features={domAnimation}>
      <div className="h-full overflow-x-clip">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={pathname.split('/')[2] ?? pathname}
            initial="pageEnter"
            animate="pageVisible"
            exit="pageExit"
            variants={variants}
            className="h-full"
          >
            {children}
          </m.div>
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}

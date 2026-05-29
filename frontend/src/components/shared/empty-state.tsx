import { m } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  heading: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ heading, description, action }: EmptyStateProps) {
  return (
    <m.div
      className="flex flex-col items-center justify-center py-20 text-center"
      variants={variants.fadeSlideUp}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-3 text-[15px] font-semibold text-foreground">{heading}</div>
      <div className="mb-6 max-w-sm text-[13px] text-foreground/65">{description}</div>
      {action}
    </m.div>
  );
}

'use client';

import { m } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-foreground/[.06] bg-background/95 backdrop-blur-sm px-4 py-4 sm:px-8 sm:py-5">
      <m.div
        variants={variants.fadeSlideUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-[18px] font-bold tracking-[-0.3px] text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-foreground/65">{subtitle}</p>
        )}
      </m.div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}

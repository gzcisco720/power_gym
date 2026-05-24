'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  segment: string;
}

interface TabNavProps {
  base: string;
  tabs: readonly Tab[];
}

export function TabNav({ base, tabs }: TabNavProps) {
  const pathname = usePathname();
  return (
    <div className="flex gap-0 border-b border-foreground/[.06] px-4 sm:px-8 overflow-x-auto">
      {tabs.map((tab) => {
        const href = `${base}${tab.segment}`;
        const isActive = tab.segment === '' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              'cursor-pointer whitespace-nowrap px-4 py-3 text-[12px] font-medium transition-colors border-b-2 -mb-px',
              isActive
                ? 'text-primary-light border-primary'
                : 'text-foreground/30 border-transparent hover:text-foreground/60',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

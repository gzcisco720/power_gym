'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Tab {
  value: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  basePath: string;
}

export function SettingsTabs({ tabs, basePath }: Props) {
  const searchParams = useSearchParams();
  const active = searchParams.get('tab') ?? tabs[0]?.value ?? '';

  return (
    <div className="flex gap-1 border-b border-foreground/10 px-4 sm:px-8">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={`${basePath}?tab=${tab.value}`}
          className={cn(
            'pb-3 pt-1 px-1 text-[13px] font-medium border-b-2 transition-colors',
            active === tab.value
              ? 'border-white text-white'
              : 'border-transparent text-foreground/50 hover:text-foreground/80',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

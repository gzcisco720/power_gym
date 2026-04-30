'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Overview', segment: '' },
  { label: 'Plan', segment: '/plan' },
  { label: 'Body Tests', segment: '/body-tests' },
  { label: 'Nutrition', segment: '/nutrition' },
  { label: 'Progress', segment: '/progress' },
  { label: 'Health', segment: '/health' },
] as const;

interface MemberTabNavProps {
  memberId: string;
}

export function MemberTabNav({ memberId }: MemberTabNavProps) {
  const pathname = usePathname();
  const base = `/trainer/members/${memberId}`;

  return (
    <div className="flex gap-0 border-b border-[#141414] px-4 sm:px-8">
      {TABS.map((tab) => {
        const href = `${base}${tab.segment}`;
        const isActive = tab.segment === '' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              'px-4 py-3 text-[12px] font-medium transition-colors border-b-2 -mb-px',
              isActive
                ? 'text-white border-white'
                : 'text-[#555] border-transparent hover:text-[#888]',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

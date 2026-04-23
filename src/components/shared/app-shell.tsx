'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/auth';

const NAV: Record<UserRole, { group: string; items: { href: string; label: string }[] }[]> = {
  member: [
    {
      group: 'TRAINING',
      items: [
        { href: '/dashboard/member/plan', label: 'My Plan' },
        { href: '/dashboard/member/pbs', label: 'Personal Bests' },
      ],
    },
    {
      group: 'HEALTH',
      items: [
        { href: '/dashboard/member/nutrition', label: 'Nutrition' },
        { href: '/dashboard/member/body-tests', label: 'Body Tests' },
      ],
    },
  ],
  trainer: [
    {
      group: 'TRAINING',
      items: [{ href: '/dashboard/trainer/plans', label: 'Plan Templates' }],
    },
    {
      group: 'HEALTH',
      items: [{ href: '/dashboard/trainer/nutrition', label: 'Nutrition Templates' }],
    },
  ],
  owner: [
    {
      group: 'TRAINING',
      items: [
        { href: '/dashboard/member/plan', label: 'My Plan' },
        { href: '/dashboard/member/pbs', label: 'Personal Bests' },
        { href: '/dashboard/trainer/plans', label: 'Plan Templates' },
      ],
    },
    {
      group: 'HEALTH',
      items: [
        { href: '/dashboard/member/nutrition', label: 'Nutrition' },
        { href: '/dashboard/member/body-tests', label: 'Body Tests' },
        { href: '/dashboard/trainer/nutrition', label: 'Nutrition Templates' },
      ],
    },
  ],
};

interface SidebarContentProps {
  role: UserRole;
  userName: string;
  userInitials: string;
}

function SidebarContent({ role, userName, userInitials }: SidebarContentProps) {
  const pathname = usePathname();
  const groups = NAV[role] ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#161616] px-5 pb-6 pt-6">
        <div className="text-[11px] font-bold leading-tight tracking-[3px] text-white">
          POWER
          <br />
          GYM
        </div>
        <div className="mt-1 text-[9px] uppercase tracking-[1px] text-[#333]">
          {role} portal
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {groups.map((group) => (
          <div key={group.group} className="mb-2">
            <div className="px-3 pb-1 pt-2 text-[8px] font-semibold uppercase tracking-[2px] text-[#2a2a2a]">
              {group.group}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-white text-black'
                    : 'text-[#3a3a3a] hover:bg-[#141414] hover:text-[#888]'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#161616] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#222] bg-[#1a1a1a] text-[11px] font-semibold text-[#666]">
            {userInitials}
          </div>
          <div>
            <div className="text-[12px] font-medium text-[#444]">{userName}</div>
            <div className="text-[10px] capitalize text-[#2a2a2a]">{role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AppShellProps {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}

export function AppShell({ role, userName, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userInitials = userName
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen bg-[#030303]">
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-[#161616] bg-[#0a0a0a] lg:flex">
        <SidebarContent role={role} userName={userName} userInitials={userInitials} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[220px] border-r border-[#161616] bg-[#0a0a0a] p-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent role={role} userName={userName} userInitials={userInitials} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-[#0f0f0f] px-4 py-3 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-[#444] hover:text-[#888] transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[11px] font-bold tracking-[3px] text-white">POWER GYM</span>
        </div>

        <main className="flex-1 overflow-y-auto bg-[#050505]">{children}</main>
      </div>
    </div>
  );
}

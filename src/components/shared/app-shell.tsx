'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/auth';

const NAV: Record<UserRole, { group: string; items: { href: string; label: string; exact?: boolean }[] }[]> = {
  member: [
    {
      group: 'TRAINING',
      items: [
        { href: '/member/plan', label: 'My Plan' },
        { href: '/member/pbs', label: 'Personal Bests' },
        { href: '/member/progress', label: 'My Progress' },
        { href: '/member/schedule', label: 'My Schedule' },
      ],
    },
    {
      group: 'HEALTH',
      items: [
        { href: '/member/nutrition', label: 'Nutrition' },
        { href: '/member/body-tests', label: 'Body Tests' },
        { href: '/member/check-in', label: 'Check-In' },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [{ href: '/member/settings', label: 'Settings' }],
    },
  ],
  trainer: [
    {
      group: 'MEMBERS',
      items: [
        { href: '/trainer/members', label: 'Members' },
        { href: '/trainer/calendar', label: 'Calendar' },
      ],
    },
    {
      group: 'TRAINING',
      items: [{ href: '/trainer/plans', label: 'Plan Templates' }],
    },
    {
      group: 'HEALTH',
      items: [{ href: '/trainer/nutrition', label: 'Nutrition Templates' }],
    },
    {
      group: 'ACCOUNT',
      items: [{ href: '/trainer/settings', label: 'Settings' }],
    },
  ],
  owner: [
    {
      group: 'ADMIN',
      items: [
        { href: '/owner', label: 'Dashboard', exact: true },
        { href: '/owner/trainers', label: 'Trainers' },
        { href: '/owner/members', label: 'Members' },
        { href: '/owner/invites', label: 'Invites' },
        { href: '/owner/calendar', label: 'Calendar' },
        { href: '/owner/equipment', label: 'Equipment' },
      ],
    },
    {
      group: 'TRAINING',
      items: [
        { href: '/member/plan', label: 'My Plan' },
        { href: '/member/pbs', label: 'Personal Bests' },
        { href: '/trainer/plans', label: 'Plan Templates' },
      ],
    },
    {
      group: 'HEALTH',
      items: [
        { href: '/member/nutrition', label: 'Nutrition' },
        { href: '/member/body-tests', label: 'Body Tests' },
        { href: '/trainer/nutrition', label: 'Nutrition Templates' },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [{ href: '/owner/settings', label: 'Settings' }],
    },
  ],
};

interface SidebarContentProps {
  role: UserRole;
  userName: string;
  userInitials: string;
  logoutSlot?: React.ReactNode;
}

function SidebarContent({ role, userName, userInitials, logoutSlot }: SidebarContentProps) {
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
        <div className="mt-1 text-[9px] uppercase tracking-[1px] text-[#777]">
          {role} portal
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {groups.map((group) => (
          <div key={group.group} className="mb-2">
            <div className="px-3 pb-1 pt-2 text-[8px] font-semibold uppercase tracking-[2px] text-[#555]">
              {group.group}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                  (item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + '/')))
                    ? 'bg-white text-black'
                    : 'text-[#666] hover:bg-[#141414] hover:text-[#aaa]'
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
            <div className="text-[12px] font-medium text-[#888]">{userName}</div>
            <div className="text-[10px] capitalize text-[#555]">{role}</div>
          </div>
        </div>
        {logoutSlot && <div className="mt-3">{logoutSlot}</div>}
      </div>
    </div>
  );
}

interface AppShellProps {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
  logoutSlot?: React.ReactNode;
}

export function AppShell({ role, userName, children, logoutSlot }: AppShellProps) {
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
        <SidebarContent role={role} userName={userName} userInitials={userInitials} logoutSlot={logoutSlot} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[220px] border-r border-[#161616] bg-[#0a0a0a] p-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent role={role} userName={userName} userInitials={userInitials} logoutSlot={logoutSlot} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-[#0f0f0f] px-4 py-3 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-[#888] hover:text-[#aaa] transition-colors"
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

import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Settings, LogOut, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverTrigger, PopoverPortal, PopoverPositioner, PopoverPopup } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn, initials } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

type UserRole = 'owner' | 'trainer' | 'member';

const NAV: Record<UserRole, { group: string; items: { href: string; label: string; exact?: boolean }[] }[]> = {
  member: [
    {
      group: 'OVERVIEW',
      items: [{ href: '/member', label: 'Dashboard', exact: true }],
    },
    {
      group: 'TRAINING',
      items: [
        { href: '/member/my-training', label: 'My Training' },
        { href: '/member/schedule', label: 'My Schedule' },
        { href: '/member/billing', label: 'My Billing' },
      ],
    },
    {
      group: 'HEALTH',
      items: [
        { href: '/member/health', label: 'My Health' },
        { href: '/member/nutrition', label: 'My Nutrition' },
        { href: '/member/body-tests', label: 'Body Tests' },
        { href: '/member/check-in', label: 'Check-In' },
        { href: '/member/journey', label: 'Journey' },
      ],
    },
  ],
  trainer: [
    {
      group: 'OVERVIEW',
      items: [{ href: '/trainer', label: 'Dashboard', exact: true }],
    },
    {
      group: 'MEMBERS',
      items: [
        { href: '/trainer/members', label: 'Members' },
        { href: '/trainer/invites', label: 'Invites' },
      ],
    },
    {
      group: 'SCHEDULE',
      items: [
        { href: '/trainer/calendar', label: 'Calendar' },
        { href: '/trainer/billing', label: 'Billing' },
      ],
    },
    {
      group: 'TEMPLATES',
      items: [
        { href: '/trainer/plans', label: 'Training Templates' },
        { href: '/trainer/nutrition', label: 'Nutrition Templates' },
      ],
    },
    {
      group: 'PERSONAL',
      items: [
        { href: '/trainer/my-training', label: 'My Training' },
        { href: '/trainer/my-nutrition', label: 'My Nutrition' },
      ],
    },
  ],
  owner: [
    {
      group: 'OVERVIEW',
      items: [{ href: '/owner', label: 'Dashboard', exact: true }],
    },
    {
      group: 'PEOPLE',
      items: [
        { href: '/owner/trainers', label: 'Trainers' },
        { href: '/owner/members', label: 'Members' },
        { href: '/owner/invites', label: 'Invites' },
      ],
    },
    {
      group: 'GYM',
      items: [
        { href: '/owner/calendar', label: 'Calendar' },
        { href: '/owner/equipment', label: 'Equipment' },
        { href: '/owner/services', label: 'Services' },
        { href: '/owner/billing', label: 'Billing' },
      ],
    },
    {
      group: 'TEMPLATES',
      items: [
        { href: '/owner/plans', label: 'Training Templates' },
        { href: '/owner/nutrition-templates', label: 'Nutrition Templates' },
      ],
    },
    {
      group: 'PERSONAL',
      items: [
        { href: '/owner/my-training', label: 'My Training' },
        { href: '/owner/my-nutrition', label: 'My Nutrition' },
        { href: '/owner/my-body-tests', label: 'My Body Tests' },
      ],
    },
  ],
};

function LogoutSection() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleConfirm() {
    setLoading(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-red-400 hover:bg-muted transition-colors cursor-pointer"
      >
        <LogOut className="size-4 shrink-0" />
        Sign out
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>Are you sure you want to sign out?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? <><Loader2 className="mr-2 size-4 animate-spin" />Signing out…</> : 'Sign out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface SidebarContentProps {
  userRole: UserRole;
  userName: string;
  userInitials: string;
  userEmail: string;
  avatarUrl: string | null;
  gymBranding?: { name: string | null; logoUrl: string | null };
}

function SidebarContent({ userRole, userName, userInitials, userEmail, avatarUrl, gymBranding }: SidebarContentProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const groups = NAV[userRole] ?? [];

  const handleNavClick = useCallback((href: string) => {
    setPendingHref(href);
  }, []);

  // Clear pending once navigation completes (pathname updated)
  if (pendingHref && (pathname === pendingHref || pathname.startsWith(pendingHref + '/'))) {
    setPendingHref(null);
  }

  function isActive(item: { href: string; exact?: boolean }) {
    const effectivePath = pendingHref ?? pathname;
    return item.exact
      ? effectivePath === item.href
      : (effectivePath === item.href || effectivePath.startsWith(item.href + '/'));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-foreground/[.06] px-5 pb-6 pt-6">
        <div className="flex items-center gap-3">
          {gymBranding?.logoUrl ? (
            <img
              src={gymBranding.logoUrl}
              alt="Gym logo"
              width={48}
              height={48}
              className="shrink-0 rounded-full object-cover border border-foreground/10"
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-[17px] font-bold text-white">
              {(gymBranding?.name ?? 'P').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[2px] text-white truncate">
              {gymBranding?.name ?? 'POWER GYM'}
            </div>
            <div className="text-[9px] uppercase tracking-[1px] text-foreground/40">
              {userRole} portal
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-1 px-2 py-4">
        {groups.map((group) => (
          <div key={group.group} className="mb-2">
            <div className="px-3 pb-1 pt-2 text-[8px] font-semibold uppercase tracking-[2px] text-foreground/25">
              {group.group}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                  isActive(item)
                    ? 'bg-primary/15 text-primary-light ring-1 ring-primary/25'
                    : 'text-foreground/40 hover:bg-white/[.04] hover:text-foreground/70'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-foreground/[.06] p-3">
        <Popover>
          <PopoverTrigger
            className="flex w-full items-center gap-3 rounded-md p-2 cursor-pointer hover:bg-white/[.04] transition-colors"
            aria-label="User menu"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                width={32}
                height={32}
                className="shrink-0 rounded-full object-cover border border-foreground/10"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-card text-[11px] font-semibold text-foreground/40">
                {userInitials}
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[12px] font-medium text-foreground/65 truncate">{userName}</div>
              <div className="text-[10px] capitalize text-foreground/40">{userRole}</div>
            </div>
          </PopoverTrigger>
          <PopoverPortal>
          <PopoverPositioner side="top" align="start">
            <PopoverPopup className="w-60 p-0 bg-card ring-1 ring-foreground/10">
              {/* User info header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-foreground/10">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    width={36}
                    height={36}
                    className="shrink-0 rounded-full object-cover border border-foreground/10"
                  />
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-muted text-[12px] font-semibold text-foreground/40">
                    {userInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{userName}</p>
                  <p className="text-[11px] text-foreground/40 truncate">{userEmail}</p>
                </div>
              </div>
              {/* Menu items */}
              <div className="py-1">
                <Link
                  to={`/${userRole}/settings`}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-foreground/65 hover:bg-muted hover:text-white transition-colors cursor-pointer"
                >
                  <Settings className="size-4 shrink-0 text-foreground/40" />
                  Profile &amp; Settings
                </Link>
                <div className="my-1 border-t border-foreground/10" />
                <LogoutSection />
              </div>
            </PopoverPopup>
          </PopoverPositioner>
          </PopoverPortal>
        </Popover>
      </div>
    </div>
  );
}

interface AppShellProps {
  userRole: UserRole;
  userName: string;
  userEmail?: string;
  avatarUrl?: string | null;
  gymBranding?: { name: string | null; logoUrl: string | null };
  children: React.ReactNode;
}

export function AppShell({ userRole, userName, userEmail = '', avatarUrl = null, gymBranding, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userInitials = initials(userName);
  const gymDisplayName = gymBranding?.name ?? 'POWER GYM';

  return (
    <div className="flex h-screen bg-[#030303]">
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-foreground/[.06] bg-[#0a0a0a] lg:flex">
        <SidebarContent userRole={userRole} userName={userName} userInitials={userInitials} userEmail={userEmail} avatarUrl={avatarUrl} gymBranding={gymBranding} />
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[220px] border-r border-foreground/[.06] bg-[#0a0a0a] p-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent userRole={userRole} userName={userName} userInitials={userInitials} userEmail={userEmail} avatarUrl={avatarUrl} gymBranding={gymBranding} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-foreground/[.04] px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="cursor-pointer text-[#888] hover:text-[#aaa] transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-[11px] font-bold tracking-[3px] text-white">{gymDisplayName}</span>
        </div>

        <main className="flex-1 overflow-y-auto bg-[#050505]">{children}</main>
      </div>
    </div>
  );
}

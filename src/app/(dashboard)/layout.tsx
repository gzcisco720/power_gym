import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { UserRole } from '@/types/auth';

const NAV: Record<UserRole, { href: string; label: string }[]> = {
  owner: [
    { href: '/dashboard/trainer/plans', label: '训练计划' },
    { href: '/dashboard/member/plan', label: '我的计划' },
    { href: '/dashboard/member/pbs', label: '个人记录' },
  ],
  trainer: [
    { href: '/dashboard/trainer/plans', label: '训练计划' },
  ],
  member: [
    { href: '/dashboard/member/plan', label: '我的计划' },
    { href: '/dashboard/member/pbs', label: '个人记录' },
  ],
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role as UserRole;
  const navLinks = NAV[role] ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">POWER GYM</span>
        <nav className="flex gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="text-sm text-muted-foreground">{session.user.name}</span>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

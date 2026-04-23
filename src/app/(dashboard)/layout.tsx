import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shared/app-shell';
import { PageTransition } from '@/components/shared/page-transition';
import type { UserRole } from '@/types/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <AppShell
      role={session.user.role as UserRole}
      userName={session.user.name ?? 'User'}
    >
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}

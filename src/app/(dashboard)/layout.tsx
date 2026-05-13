import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { AppShell } from '@/components/shared/app-shell';
import { PageTransition } from '@/components/shared/page-transition';
import { LogoutButton } from '@/components/shared/logout-button';
import type { UserRole } from '@/types/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  await connectDB();
  const profile = await new MongoUserProfileRepository().findByUserId(session.user.id);

  return (
    <AppShell
      role={session.user.role as UserRole}
      userName={`${session.user.firstName} ${session.user.lastName}`}
      userEmail={session.user.email ?? ''}
      avatarUrl={profile?.avatarUrl ?? null}
      logoutSlot={<LogoutButton />}
    >
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}

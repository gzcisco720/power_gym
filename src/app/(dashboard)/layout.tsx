import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { AppShell } from '@/components/shared/app-shell';
import { PageTransition } from '@/components/shared/page-transition';
import { LogoutButton } from '@/components/shared/logout-button';
import type { UserRole } from '@/types/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  await connectDB();
  const [profile, user] = await Promise.all([
    new MongoUserProfileRepository().findByUserId(session.user.id),
    new MongoUserRepository().findById(session.user.id),
  ]);

  const firstName = user?.firstName ?? session.user.firstName ?? '';
  const lastName = user?.lastName ?? session.user.lastName ?? '';

  return (
    <AppShell
      role={session.user.role as UserRole}
      userName={`${firstName} ${lastName}`.trim() || 'User'}
      userEmail={user?.email ?? session.user.email ?? ''}
      avatarUrl={profile?.avatarUrl ?? null}
      logoutSlot={<LogoutButton />}
    >
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}

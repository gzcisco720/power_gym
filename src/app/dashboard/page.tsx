import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';

const ROLE_DEFAULT_PATH = {
  owner: '/owner',
  trainer: '/trainer/members',
  member: '/member/plan',
} as const;

export default async function DashboardRedirectPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role as keyof typeof ROLE_DEFAULT_PATH;
  redirect(ROLE_DEFAULT_PATH[role] ?? '/login');
}

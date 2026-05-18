import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MemberTrainingLanding } from '@/components/self-tracking/member-training-landing';

export default async function MemberMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');
  return <MemberTrainingLanding />;
}

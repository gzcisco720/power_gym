import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { SelfWorkoutSession } from '@/components/self-tracking/self-workout-session';

export default async function MemberMyTrainingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');
  const { id } = await params;
  return <SelfWorkoutSession logId={id} basePath="/member/my-training" />;
}

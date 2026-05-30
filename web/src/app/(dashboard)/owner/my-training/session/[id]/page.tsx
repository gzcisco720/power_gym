import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { SelfWorkoutSession } from '@/components/self-tracking/self-workout-session';

export default async function OwnerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');
  const { id } = await params;
  return <SelfWorkoutSession logId={id} basePath="/owner/my-training" />;
}

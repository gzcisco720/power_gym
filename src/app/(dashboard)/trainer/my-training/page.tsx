import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyTrainingLanding } from '@/components/self-tracking/my-training-landing';

export default async function TrainerMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');
  return <MyTrainingLanding basePath="/trainer/my-training" />;
}

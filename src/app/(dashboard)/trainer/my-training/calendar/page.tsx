import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyTrainingCalendarClient } from '@/components/self-tracking/my-training-calendar-client';

export default async function TrainerTrainingCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');
  return <MyTrainingCalendarClient backHref="/trainer/my-training" />;
}

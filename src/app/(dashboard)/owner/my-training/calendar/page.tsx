import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyTrainingCalendarClient } from '@/components/self-tracking/my-training-calendar-client';

export default async function OwnerTrainingCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');
  return <MyTrainingCalendarClient backHref="/owner/my-training" />;
}

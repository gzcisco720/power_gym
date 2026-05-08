import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyNutritionCalendarClient } from '@/components/self-tracking/my-nutrition-calendar-client';

export default async function TrainerNutritionCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');
  return <MyNutritionCalendarClient backHref="/trainer/my-nutrition" mainHref="/trainer/my-nutrition" />;
}

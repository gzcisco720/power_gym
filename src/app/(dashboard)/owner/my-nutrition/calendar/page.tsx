import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyNutritionCalendarClient } from '@/components/self-tracking/my-nutrition-calendar-client';

export default async function OwnerNutritionCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');
  return <MyNutritionCalendarClient backHref="/owner/my-nutrition" mainHref="/owner/my-nutrition" />;
}

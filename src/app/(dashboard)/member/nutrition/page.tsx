import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { DailyNutritionView } from '@/components/nutrition/daily-nutrition-view';

export default async function MemberNutritionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');

  const today = new Date().toISOString().slice(0, 10);

  return <DailyNutritionView memberId={session.user.id} initialDate={today} />;
}

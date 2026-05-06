import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { DailyNutritionView } from '@/components/nutrition/daily-nutrition-view';

export default async function MemberNutritionPage(): Promise<JSX.Element> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container py-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">My Nutrition</h1>
      <DailyNutritionView memberId={session.user.id} initialDate={today} />
    </div>
  );
}

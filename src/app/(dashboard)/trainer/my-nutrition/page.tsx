import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

export default async function TrainerMyNutritionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Nutrition"
        actions={
          <Link
            href="/trainer/my-nutrition/calendar"
            className="text-[11px] text-foreground/65 hover:text-foreground transition-colors"
          >
            View Calendar →
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <SelfNutritionDayView initialDate={today} />
      </div>
    </div>
  );
}

import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { SelfNutritionDayViewWithRouter } from './_components/day-view-with-router';
import { NutritionCalendarHeaderTrigger } from '@/components/self-tracking/nutrition-calendar-header-trigger';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function TrainerMyNutritionPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');

  const { date: rawDate } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = rawDate && DATE_RE.test(rawDate) && rawDate <= today ? rawDate : today;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Nutrition"
        actions={<NutritionCalendarHeaderTrigger basePath="/trainer/my-nutrition" />}
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <SelfNutritionDayViewWithRouter initialDate={date} basePath="/trainer/my-nutrition" />
      </div>
    </div>
  );
}

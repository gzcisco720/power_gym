import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { SelfNutritionDayViewWithRouter } from './_components/day-view-with-router';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function OwnerMyNutritionPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');

  const { date: rawDate } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = rawDate && DATE_RE.test(rawDate) && rawDate <= today ? rawDate : today;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="My Nutrition" />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <SelfNutritionDayViewWithRouter initialDate={date} basePath="/owner/my-nutrition" />
      </div>
    </div>
  );
}

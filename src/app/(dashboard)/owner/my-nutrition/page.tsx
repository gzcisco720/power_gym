import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
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

  return <SelfNutritionDayViewWithRouter initialDate={date} basePath="/owner/my-nutrition" />;
}

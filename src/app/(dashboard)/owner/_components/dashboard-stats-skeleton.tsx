import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';

export function DashboardStatsSkeleton() {
  return <StatCardsSkeleton count={4} className="sm:grid-cols-4" />;
}

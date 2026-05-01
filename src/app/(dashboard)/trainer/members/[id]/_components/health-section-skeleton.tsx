import { Skeleton } from '@/components/ui/skeleton';

export function HealthSectionSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-[80px] rounded-xl" />
    </div>
  );
}

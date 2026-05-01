import { Skeleton } from '@/components/ui/skeleton';

export function ProgressSkeleton() {
  return (
    <div className="space-y-6 px-4 sm:px-8 py-7">
      <Skeleton className="h-[120px] rounded-xl" />
      <Skeleton className="h-[200px] rounded-xl" />
    </div>
  );
}

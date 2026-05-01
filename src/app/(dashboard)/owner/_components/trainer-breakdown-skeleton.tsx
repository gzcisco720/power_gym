import { Skeleton } from '@/components/ui/skeleton';

export function TrainerBreakdownSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-32" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-10 rounded-lg" />
      ))}
    </div>
  );
}

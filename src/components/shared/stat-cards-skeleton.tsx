import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function StatCardsSkeleton({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-xl" />
      ))}
    </div>
  );
}

import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  imageUrl: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function ExerciseThumbnail({ imageUrl, name, size = 40, className }: Props) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={cn('rounded-md object-cover shrink-0', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      data-testid="thumbnail-placeholder"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md bg-[#161616]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Dumbbell className="text-[#444]" style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { WorkoutCalendarPopover } from './workout-calendar-popover';

interface Props {
  basePath: '/owner/my-training' | '/trainer/my-training' | '/member/my-training';
}

export function WorkoutCalendarHeaderTrigger({ basePath }: Props) {
  const router = useRouter();
  return (
    <WorkoutCalendarPopover
      onSelectLog={(logId) => router.push(`${basePath}/session/${logId}`)}
      trigger={
        <button
          aria-label="Open calendar"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <Calendar className="h-4 w-4" />
        </button>
      }
    />
  );
}

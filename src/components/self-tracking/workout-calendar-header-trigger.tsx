'use client';

import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { WorkoutCalendarPopover } from './workout-calendar-popover';

interface Props {
  basePath: '/owner/my-training' | '/trainer/my-training' | '/member/my-training';
}

export function WorkoutCalendarHeaderTrigger({ basePath }: Props) {
  const { push } = useRouter();
  return (
    <WorkoutCalendarPopover
      onSelectLog={(logId) => push(`${basePath}/session/${logId}`)}
      trigger={
        <button
          type="button"
          aria-label="Open calendar"
          className="inline-flex size-8 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <Calendar className="size-4" />
        </button>
      }
    />
  );
}

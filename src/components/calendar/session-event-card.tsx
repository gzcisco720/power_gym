'use client';

import { RefreshCw } from 'lucide-react';

// Thresholds mirror Outlook's progressive disclosure:
// compact  < 30px  → title only (1 line)
// medium  < 56px  → title + time (2 lines)
// full   >= 56px  → title + members + time (3 lines, only when service type exists)
const COMPACT_MAX = 30;
const MEDIUM_MAX = 56;

interface SessionEventCardProps {
  memberNames: string[];
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  serviceTypeName: string | null;
  trainerColor: string;
  heightPx: number;
  onClick: () => void;
}

export function SessionEventCard({
  memberNames,
  startTime,
  endTime,
  isRecurring,
  serviceTypeName,
  trainerColor,
  heightPx,
  onClick,
}: SessionEventCardProps) {
  const title = serviceTypeName ?? memberNames.join(', ');
  const isCompact = heightPx < COMPACT_MAX;
  const isMedium = heightPx < MEDIUM_MAX;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-x-0.5 inset-y-0 rounded text-left overflow-hidden text-[11px] leading-tight px-1.5 py-1 hover:brightness-110 transition-[filter]"
      style={{ backgroundColor: trainerColor, color: '#fff' }}
    >
      <div className="font-semibold truncate">{title}</div>
      {!isCompact && !isMedium && serviceTypeName && (
        <div className="truncate opacity-90">{memberNames.join(', ')}</div>
      )}
      {!isCompact && (
        <div className="opacity-80">
          {startTime}–{endTime}
          {isRecurring && <RefreshCw className="inline h-2.5 w-2.5 ml-0.5 opacity-80" />}
        </div>
      )}
    </button>
  );
}

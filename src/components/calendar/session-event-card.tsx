'use client';

import { RefreshCw } from 'lucide-react';

interface SessionEventCardProps {
  memberNames: string[];
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  trainerColor: string;
  onClick: () => void;
}

export function SessionEventCard({
  memberNames,
  startTime,
  endTime,
  isRecurring,
  trainerColor,
  onClick,
}: SessionEventCardProps) {
  return (
    <button
      onClick={onClick}
      className="absolute inset-x-0.5 rounded text-left overflow-hidden text-[11px] leading-tight px-1.5 py-1 hover:brightness-110 transition-[filter]"
      style={{ backgroundColor: trainerColor, color: '#fff' }}
    >
      <div className="font-semibold truncate">{memberNames.join(', ')}</div>
      <div className="opacity-80">
        {startTime}–{endTime}
        {isRecurring && <RefreshCw className="inline h-2.5 w-2.5 ml-0.5 opacity-80" />}
      </div>
    </button>
  );
}

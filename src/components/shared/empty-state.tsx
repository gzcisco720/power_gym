import type { ReactNode } from 'react';

interface EmptyStateProps {
  heading: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-3 text-[15px] font-semibold text-white">{heading}</div>
      <div className="mb-6 max-w-sm text-[13px] text-[#888]">{description}</div>
      {action}
    </div>
  );
}

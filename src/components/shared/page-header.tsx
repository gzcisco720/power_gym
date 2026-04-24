import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#0f0f0f] bg-[#050505] px-8 py-5">
      <div>
        <h1 className="text-[18px] font-bold tracking-[-0.3px] text-white">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-[#333]">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}

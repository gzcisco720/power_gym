import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Overview', segment: '' },
  { label: 'Plan', segment: '/plan' },
  { label: 'Body Tests', segment: '/body-tests' },
  { label: 'Nutrition', segment: '/nutrition' },
  { label: 'Health', segment: '/health' },
  { label: 'Check-ins', segment: '/check-ins' },
  { label: 'Photos', segment: '/photos' },
  { label: 'Billing', segment: '/billing' },
] as const;

interface MemberHubTabNavProps {
  basePath: string;
}

export function MemberHubTabNav({ basePath }: MemberHubTabNavProps) {
  const location = useLocation();

  return (
    <div className="flex gap-0 border-b border-foreground/[.06] px-4 sm:px-8 overflow-x-auto">
      {TABS.map((tab) => {
        const href = `${basePath}${tab.segment}`;
        const isActive = tab.segment === ''
          ? location.pathname === basePath || location.pathname === `${basePath}/`
          : location.pathname.startsWith(href);

        return (
          <NavLink
            key={tab.label}
            to={href}
            className={cn(
              'cursor-pointer whitespace-nowrap px-4 py-3 text-[12px] font-medium transition-colors border-b-2 -mb-px',
              isActive
                ? 'text-primary-light border-primary'
                : 'text-foreground/30 border-transparent hover:text-foreground/60',
            )}
          >
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}

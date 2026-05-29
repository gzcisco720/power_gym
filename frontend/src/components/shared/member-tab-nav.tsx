import { NavLink, useLocation } from 'react-router-dom';

interface Tab {
  label: string;
  segment: string;
}

const TABS: Tab[] = [
  { label: 'Overview', segment: '' },
  { label: 'Plan', segment: '/plan' },
  { label: 'Body Tests', segment: '/body-tests' },
  { label: 'Nutrition', segment: '/nutrition' },
  { label: 'Health', segment: '/health' },
  { label: 'Check-ins', segment: '/check-ins' },
  { label: 'Photos', segment: '/photos' },
  { label: 'Progress', segment: '/progress' },
  { label: 'Billing', segment: '/billing' },
];

interface MemberTabNavProps {
  basePath: string;
}

export function MemberTabNav({ basePath }: MemberTabNavProps) {
  const { pathname } = useLocation();

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-foreground/[.06] px-4 sm:px-8 pb-0 scrollbar-none">
      {TABS.map(({ label, segment }) => {
        const to = `${basePath}${segment}`;
        const isActive =
          segment === ''
            ? pathname === basePath || pathname === `${basePath}/`
            : pathname.startsWith(to);

        return (
          <NavLink
            key={segment}
            to={to}
            end={segment === ''}
            className={[
              'shrink-0 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-foreground/65 hover:text-foreground',
            ].join(' ')}
          >
            {label}
          </NavLink>
        );
      })}
    </div>
  );
}

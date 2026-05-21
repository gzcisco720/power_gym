import { TabNav } from './tab-nav';

const TABS = [
  { label: 'Overview', segment: '' },
  { label: 'Plan', segment: '/plan' },
  { label: 'Body Tests', segment: '/body-tests' },
  { label: 'Nutrition', segment: '/nutrition' },
  { label: 'Health', segment: '/health' },
  { label: 'Check-ins', segment: '/check-ins' },
  { label: 'Photos', segment: '/photos' },
] as const;

export function MemberTabNav({ basePath }: { basePath: string }) {
  return <TabNav base={basePath} tabs={TABS} />;
}

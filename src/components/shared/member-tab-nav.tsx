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

export function MemberTabNav({ memberId }: { memberId: string }) {
  return <TabNav base={`/trainer/members/${memberId}`} tabs={TABS} />;
}

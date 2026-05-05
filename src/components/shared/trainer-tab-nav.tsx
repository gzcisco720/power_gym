import { TabNav } from './tab-nav';

const TABS = [
  { label: 'Overview', segment: '' },
  { label: 'Members', segment: '/members' },
  { label: 'Calendar', segment: '/calendar' },
] as const;

export function TrainerTabNav({ trainerId }: { trainerId: string }) {
  return <TabNav base={`/owner/trainers/${trainerId}`} tabs={TABS} />;
}

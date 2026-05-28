import { TabNav } from './tab-nav';

const TABS = [
  { label: 'Overview',        segment: ''                 },
  { label: 'Members',         segment: '/members'         },
  { label: 'Calendar',        segment: '/calendar'        },
  { label: 'Training Plans',  segment: '/training-plans'  },
  { label: 'Nutrition Plans', segment: '/nutrition-plans' },
] as const;

export function TrainerTabNav({ trainerId }: { trainerId: string }) {
  return <TabNav base={`/owner/trainers/${trainerId}`} tabs={TABS} />;
}

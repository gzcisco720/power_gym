export interface PresetPlanDay {
  name: string;
  exercises: never[];
}

export interface PresetPlan {
  name: string;
  summary: string;
  dayCount: number;
  days: PresetPlanDay[];
}

export const PRESET_PLANS: Record<string, PresetPlan> = {
  ppl: {
    name: 'Push · Pull · Legs',
    summary: '6 days · 3 day-groups · classic split',
    dayCount: 6,
    days: [
      { name: 'Push A', exercises: [] },
      { name: 'Pull A', exercises: [] },
      { name: 'Legs A', exercises: [] },
      { name: 'Push B', exercises: [] },
      { name: 'Pull B', exercises: [] },
      { name: 'Legs B', exercises: [] },
    ],
  },
  'upper-lower': {
    name: 'Upper / Lower',
    summary: '4 days · 2 day-groups · time-friendly',
    dayCount: 4,
    days: [
      { name: 'Upper A', exercises: [] },
      { name: 'Lower A', exercises: [] },
      { name: 'Upper B', exercises: [] },
      { name: 'Lower B', exercises: [] },
    ],
  },
  'full-body': {
    name: 'Full Body',
    summary: '3 days · single rotation · beginner-friendly',
    dayCount: 3,
    days: [
      { name: 'Full Body A', exercises: [] },
      { name: 'Full Body B', exercises: [] },
      { name: 'Full Body C', exercises: [] },
    ],
  },
};

export function isPresetKey(key: string): boolean {
  return key in PRESET_PLANS;
}

export function getPresetPlan(key: string): PresetPlan | null {
  return PRESET_PLANS[key] ?? null;
}

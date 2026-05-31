export type UserRole = 'owner' | 'trainer' | 'member';

export interface NavItem {
  key: string;
  label: string;
  screen: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_CONFIG: Record<UserRole, NavGroup[]> = {
  owner: [
    {
      label: 'OVERVIEW',
      items: [{ key: 'Dashboard', label: 'Dashboard', screen: 'Dashboard' }],
    },
    {
      label: 'PEOPLE',
      items: [
        { key: 'Trainers', label: 'Trainers', screen: 'Trainers' },
        { key: 'Members', label: 'Members', screen: 'Members' },
        { key: 'Invites', label: 'Invites', screen: 'Invites' },
      ],
    },
    {
      label: 'GYM',
      items: [
        { key: 'Calendar', label: 'Calendar', screen: 'Calendar' },
        { key: 'Equipment', label: 'Equipment', screen: 'Equipment' },
        { key: 'Services', label: 'Services', screen: 'Services' },
        { key: 'Billing', label: 'Billing', screen: 'Billing' },
      ],
    },
    {
      label: 'TEMPLATES',
      items: [
        { key: 'TrainingTemplates', label: 'Training Templates', screen: 'TrainingTemplates' },
        { key: 'NutritionTemplates', label: 'Nutrition Templates', screen: 'NutritionTemplates' },
      ],
    },
    {
      label: 'PERSONAL',
      items: [
        { key: 'MyTraining', label: 'My Training', screen: 'MyTraining' },
        { key: 'MyNutrition', label: 'My Nutrition', screen: 'MyNutrition' },
        { key: 'MyBodyTests', label: 'My Body Tests', screen: 'MyBodyTests' },
      ],
    },
  ],

  trainer: [
    {
      label: 'OVERVIEW',
      items: [{ key: 'Dashboard', label: 'Dashboard', screen: 'Dashboard' }],
    },
    {
      label: 'MEMBERS',
      items: [
        { key: 'Members', label: 'Members', screen: 'Members' },
        { key: 'Invites', label: 'Invites', screen: 'Invites' },
      ],
    },
    {
      label: 'SCHEDULE',
      items: [
        { key: 'Calendar', label: 'Calendar', screen: 'Calendar' },
        { key: 'Billing', label: 'Billing', screen: 'Billing' },
      ],
    },
    {
      label: 'TEMPLATES',
      items: [
        { key: 'TrainingTemplates', label: 'Training Templates', screen: 'TrainingTemplates' },
        { key: 'NutritionTemplates', label: 'Nutrition Templates', screen: 'NutritionTemplates' },
      ],
    },
    {
      label: 'PERSONAL',
      items: [
        { key: 'MyTraining', label: 'My Training', screen: 'MyTraining' },
        { key: 'MyNutrition', label: 'My Nutrition', screen: 'MyNutrition' },
      ],
    },
  ],

  member: [
    {
      label: 'OVERVIEW',
      items: [{ key: 'Dashboard', label: 'Dashboard', screen: 'Dashboard' }],
    },
    {
      label: 'TRAINING',
      items: [
        { key: 'MyTraining', label: 'My Training', screen: 'MyTraining' },
        { key: 'MySchedule', label: 'My Schedule', screen: 'MySchedule' },
        { key: 'Billing', label: 'Billing', screen: 'Billing' },
      ],
    },
    {
      label: 'HEALTH',
      items: [
        { key: 'MyHealth', label: 'My Health', screen: 'MyHealth' },
        { key: 'MyNutrition', label: 'My Nutrition', screen: 'MyNutrition' },
        { key: 'BodyTests', label: 'Body Tests', screen: 'BodyTests' },
        { key: 'CheckIn', label: 'Check-In', screen: 'CheckIn' },
        { key: 'Journey', label: 'Journey', screen: 'Journey' },
      ],
    },
  ],
};

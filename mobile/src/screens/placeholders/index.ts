import React from 'react';
import { View, Text } from 'react-native';
import { Screen } from '../../components/Screen';

/**
 * Factory that creates a named placeholder screen component.
 * Each call with the same (title, testID) always produces the same component class
 * so React Navigation doesn't treat it as a new component on re-render.
 */
const cache = new Map<string, () => React.JSX.Element>();

export function makePlaceholder(title: string, testID: string): () => React.JSX.Element {
  if (!cache.has(testID)) {
    const Component = function PlaceholderComponent() {
      return React.createElement(
        Screen,
        { testID },
        React.createElement(
          View,
          { className: 'flex-1 px-4 py-6' },
          React.createElement(
            Text,
            { className: 'text-[18px] font-semibold tracking-[-0.3px] text-foreground' },
            title,
          ),
        ),
      );
    };
    Component.displayName = `PlaceholderScreen(${title})`;
    cache.set(testID, Component);
  }
  return cache.get(testID)!;
}

// Owner screens
export const TrainersScreen = makePlaceholder('Trainers', 'screen-Trainers');
export const MembersScreen = makePlaceholder('Members', 'screen-Members');
export const InvitesScreen = makePlaceholder('Invites', 'screen-Invites');
export const CalendarScreen = makePlaceholder('Calendar', 'screen-Calendar');
export const ServicesScreen = makePlaceholder('Services', 'screen-Services');
export const BillingScreen = makePlaceholder('Billing', 'screen-Billing');
export const TrainingTemplatesScreen = makePlaceholder('Training Templates', 'screen-TrainingTemplates');
export const NutritionTemplatesScreen = makePlaceholder(
  'Nutrition Templates',
  'screen-NutritionTemplates',
);
export const MyTrainingScreen = makePlaceholder('My Training', 'screen-MyTraining');
export const MyNutritionScreen = makePlaceholder('My Nutrition', 'screen-MyNutrition');
export const MyBodyTestsScreen = makePlaceholder('My Body Tests', 'screen-MyBodyTests');

// Member-only screens
export const MyScheduleScreen = makePlaceholder('My Schedule', 'screen-MySchedule');
export const MyHealthScreen = makePlaceholder('My Health', 'screen-MyHealth');
export const BodyTestsScreen = makePlaceholder('Body Tests', 'screen-BodyTests');
export const CheckInScreen = makePlaceholder('Check-In', 'screen-CheckIn');
export const JourneyScreen = makePlaceholder('Journey', 'screen-Journey');

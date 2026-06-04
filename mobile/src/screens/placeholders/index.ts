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
export const MyNutritionScreen = makePlaceholder('My Nutrition', 'screen-MyNutrition');

// Member-only screens
export const JourneyScreen = makePlaceholder('Journey', 'screen-Journey');

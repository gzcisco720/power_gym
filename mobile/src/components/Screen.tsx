import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export function Screen({ children, scrollable = false }: ScreenProps) {
  const insets = useSafeAreaInsets();

  if (scrollable) {
    return (
      <View testID="screen-container" className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      testID="screen-container"
      className="flex-1 bg-background"
      style={{ paddingBottom: insets.bottom }}
    >
      {children}
    </View>
  );
}

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  safeTop?: boolean;
}

export function ScreenHeader({ title, onBack, right, safeTop = true }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center border-b border-foreground/[.06] bg-background px-4"
      style={{ paddingTop: (safeTop ? insets.top : 0) + 12, paddingBottom: 12 }}
    >
      {onBack && (
        <Pressable
          testID="screen-header-back"
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="mr-3 p-1"
        >
          <Text className="text-[18px] text-foreground">←</Text>
        </Pressable>
      )}
      <Text className="flex-1 text-[18px] font-semibold tracking-[-0.3px] text-foreground">
        {title}
      </Text>
      {right}
    </View>
  );
}

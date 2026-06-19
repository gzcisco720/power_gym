import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '~/components/ui/button';

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
        <Button
          testID="screen-header-back"
          onPress={onBack}
          accessibilityLabel="Go back"
          variant="ghost"
          size="icon"
          className="mr-2"
        >
          <Text className="text-[18px] text-foreground">←</Text>
        </Button>
      )}
      <Text className="flex-1 text-[18px] font-semibold tracking-[-0.3px] text-foreground">
        {title}
      </Text>
      {right}
    </View>
  );
}

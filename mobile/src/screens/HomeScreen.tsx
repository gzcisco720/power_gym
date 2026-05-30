import React from 'react';
import { View, Text } from 'react-native';

export function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
        Power Gym
      </Text>
    </View>
  );
}

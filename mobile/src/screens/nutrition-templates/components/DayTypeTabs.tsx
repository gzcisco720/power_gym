import React from 'react';
import { Text, Pressable, ScrollView } from 'react-native';

interface DayTypeTabsProps {
  dayTypes: string[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

export function DayTypeTabs({ dayTypes, activeIndex, onTabPress }: DayTypeTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-foreground/[.06]"
      contentContainerStyle={{ paddingHorizontal: 16, gap: 4 }}
      style={{ flexGrow: 0 }}
    >
      {dayTypes.map((name, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={name}
            testID={`day-type-tab-${name}`}
            onPress={() => onTabPress(index)}
            accessibilityLabel={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            className={`px-3 py-2.5 ${isActive ? 'border-b-2 border-primary' : ''}`}
          >
            <Text
              className={`text-sm font-semibold ${
                isActive ? 'text-foreground' : 'text-foreground/65'
              }`}
            >
              {name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

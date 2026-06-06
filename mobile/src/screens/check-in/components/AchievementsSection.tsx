import React from 'react';
import { View, Text } from 'react-native';

const THRESHOLDS = [7, 14, 30, 60, 100] as const;

interface AchievementsSectionProps {
  streakWeeks: number;
}

export function AchievementsSection({ streakWeeks }: AchievementsSectionProps) {
  return (
    <View className="gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Achievements
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {THRESHOLDS.map((threshold) => {
          const achieved = streakWeeks >= threshold;
          return (
            <View
              key={threshold}
              testID={`achievement-badge-${threshold}`}
              accessibilityState={{ selected: achieved }}
              className={`rounded-full px-3 py-1 ${
                achieved ? 'bg-primary/20' : 'bg-muted'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  achieved ? 'text-primary-light' : 'text-foreground/35'
                }`}
              >
                {threshold}w
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

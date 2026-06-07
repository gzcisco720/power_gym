import React from 'react';
import { View, Text } from 'react-native';
import { PersonalBest } from '../../../../types/training';

interface PersonalBestsGridProps {
  personalBests: PersonalBest[];
}

export function PersonalBestsGrid({ personalBests }: PersonalBestsGridProps) {
  if (personalBests.length === 0) {
    return (
      <Text testID="personal-bests-empty" className="text-[13px] text-foreground/65 text-center mt-2">
        No personal bests recorded yet.
      </Text>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {personalBests.map((pr) => (
        <View
          key={pr.exerciseId}
          testID={`personal-best-${pr.exerciseId}`}
          className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-1 min-w-[44%]"
        >
          <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
            {pr.exerciseName}
          </Text>
          <Text className="text-sm font-semibold text-foreground mt-1 tabular-nums">
            {`${pr.bestWeight} kg × ${pr.bestReps}`}
          </Text>
          <View className="flex-row items-center gap-1 mt-1">
            <Text className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
              Est. 1RM
            </Text>
            <Text className="text-[11px] font-semibold text-primary-light tabular-nums">
              {`${pr.estimatedOneRM} kg`}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

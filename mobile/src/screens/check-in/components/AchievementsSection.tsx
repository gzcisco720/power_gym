import React from 'react';
import { View, Text } from 'react-native';

const THRESHOLDS = [7, 14, 30, 60, 100] as const;

interface AchievementsSectionProps {
  streakWeeks: number;
  weightLost?: number | null;
  dietStreak?: number;
  totalCheckIns?: number;
}

export function AchievementsSection({
  streakWeeks,
  weightLost,
  dietStreak = 0,
  totalCheckIns = 0,
}: AchievementsSectionProps) {
  const showWeightCard = weightLost !== null && weightLost !== undefined && weightLost > 0;
  const showDietCard = dietStreak >= 2;

  return (
    <View className="gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Achievements
      </Text>

      {/* Dynamic achievement cards (when applicable) */}
      {(showWeightCard || showDietCard) && (
        <View className="gap-2">
          {showWeightCard && (
            <View
              testID="achievement-card-weight-lost"
              className="rounded-xl border border-primary/20 bg-primary/[0.08] px-4 py-3 flex-row items-center gap-3"
            >
              <Text className="text-2xl">🏆</Text>
              <View>
                <Text className="text-sm font-bold text-foreground">
                  {`Lost ${weightLost} kg`}
                </Text>
                <Text className="text-[11px] text-foreground/65 mt-0.5">
                  {`Over ${totalCheckIns} check-ins`}
                </Text>
              </View>
            </View>
          )}
          {showDietCard && (
            <View
              testID="achievement-card-diet-streak"
              className="rounded-xl border border-amber-400/[0.18] bg-amber-400/[0.07] px-4 py-3 flex-row items-center gap-3"
            >
              <Text className="text-2xl">🥗</Text>
              <View>
                <Text className="text-sm font-bold text-foreground">
                  {`${dietStreak} on-track in a row`}
                </Text>
                <Text className="text-[11px] text-foreground/65 mt-0.5">
                  Best diet consistency streak
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Milestone streak badges */}
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

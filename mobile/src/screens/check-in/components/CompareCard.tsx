import React from 'react';
import { View, Text } from 'react-native';
import { CheckIn } from '../../../types/check-ins';
import { wellnessAvg } from '../../../lib/check-ins/wellness';

interface CompareCardProps {
  current: CheckIn;
  previous: CheckIn;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function CompareCard({ current, previous }: CompareCardProps) {
  return (
    <View className="gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Compare
      </Text>
      <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 flex-row gap-4">
        {/* Current */}
        <View className="flex-1 gap-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Latest
          </Text>
          <Text testID="compare-current-date" className="text-sm font-medium text-foreground">
            {formatShortDate(current.submittedAt)}
          </Text>
          <Text testID="compare-current-wellness" className="text-2xl font-semibold text-primary-light tabular-nums">
            {wellnessAvg(current)}
          </Text>
          {current.weight !== null && (
            <Text className="text-xs text-foreground/65">{current.weight} kg</Text>
          )}
        </View>

        {/* Divider */}
        <View className="w-px bg-foreground/10" />

        {/* Previous */}
        <View className="flex-1 gap-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Previous
          </Text>
          <Text testID="compare-previous-date" className="text-sm font-medium text-foreground">
            {formatShortDate(previous.submittedAt)}
          </Text>
          <Text testID="compare-previous-wellness" className="text-2xl font-semibold text-foreground/65 tabular-nums">
            {wellnessAvg(previous)}
          </Text>
          {previous.weight !== null && (
            <Text className="text-xs text-foreground/65">{previous.weight} kg</Text>
          )}
        </View>
      </View>
    </View>
  );
}

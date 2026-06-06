import React from 'react';
import { View, Text } from 'react-native';
import { CheckIn } from '../../../types/check-ins';
import { wellnessBreakdown } from '../../../lib/check-ins/wellness';

interface WellnessBreakdownSectionProps {
  checkIn: CheckIn;
}

export function WellnessBreakdownSection({ checkIn }: WellnessBreakdownSectionProps) {
  const entries = wellnessBreakdown(checkIn);

  return (
    <View className="gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Last Check-In Wellness
      </Text>
      <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 gap-2">
        {entries.map(({ label, value }) => (
          <View key={label} className="flex-row items-center justify-between">
            <Text className="text-[13px] text-foreground/65">{label}</Text>
            <View className="flex-row items-center gap-2">
              {/* Simple bar */}
              <View className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(value / 10) * 100}%` }}
                />
              </View>
              <Text className="text-[13px] font-semibold text-primary-light w-6 text-right tabular-nums">
                {value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

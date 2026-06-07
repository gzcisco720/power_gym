import React from 'react';
import { View, Text } from 'react-native';
import { CheckIn } from '../../../types/check-ins';
import { wellnessBreakdown } from '../../../lib/check-ins/wellness';

interface WellnessBreakdownSectionProps {
  checkIn: CheckIn;
}

function barColor(value: number, inverted: boolean): string {
  const effective = inverted ? 11 - value : value;
  if (effective >= 7) return 'bg-primary';
  if (effective >= 5) return 'bg-amber-400';
  return 'bg-rose-400';
}

function valueColor(value: number, inverted: boolean): string {
  const effective = inverted ? 11 - value : value;
  if (effective >= 7) return 'text-primary-light';
  if (effective >= 5) return 'text-amber-300';
  return 'text-rose-300';
}

export function WellnessBreakdownSection({ checkIn }: WellnessBreakdownSectionProps) {
  const entries = wellnessBreakdown(checkIn);

  return (
    <View className="gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Last Check-In Wellness
      </Text>
      <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 gap-2">
        {entries.map(({ label, value, inverted }) => (
          <View key={label} className="flex-row items-center justify-between">
            <Text className="text-[13px] text-foreground/65">{label}</Text>
            <View className="flex-row items-center gap-2">
              <View className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${barColor(value, inverted)}`}
                  style={{ width: `${(value / 10) * 100}%` }}
                />
              </View>
              <Text className={`text-[13px] font-semibold w-6 text-right tabular-nums ${valueColor(value, inverted)}`}>
                {value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

import React from 'react';
import { View, Text } from 'react-native';
import { CheckIn } from '../../../types/check-ins';

interface MetricConfig {
  key: keyof Pick<
    CheckIn,
    'weight' | 'waist' | 'steps' | 'exerciseMinutes' | 'walkRunDistance' | 'sleepHours'
  >;
  label: string;
  unit: string;
}

const METRICS: MetricConfig[] = [
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'steps', label: 'Steps', unit: '' },
  { key: 'exerciseMinutes', label: 'Exercise', unit: 'min' },
  { key: 'walkRunDistance', label: 'Walk/Run', unit: 'km' },
  { key: 'sleepHours', label: 'Sleep', unit: 'hrs' },
];

interface BodyMetricsSummarySectionProps {
  checkIn: CheckIn;
}

export function BodyMetricsSummarySection({ checkIn }: BodyMetricsSummarySectionProps) {
  const populated = METRICS.filter((m) => checkIn[m.key] !== null);

  return (
    <View className="gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Body Metrics
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {populated.map(({ key, label, unit }) => (
          <View
            key={key}
            className="flex-1 min-w-[44%] rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-0.5"
          >
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              {label}
            </Text>
            <Text className="text-2xl font-semibold text-foreground tabular-nums">
              {checkIn[key]}
              {unit ? (
                <Text className="text-sm font-medium text-foreground/65"> {unit}</Text>
              ) : null}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

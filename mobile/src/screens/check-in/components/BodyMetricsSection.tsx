import React from 'react';
import { View, Text, TextInput } from 'react-native';

const COLORS = { placeholder: 'rgba(255,255,255,0.4)' } as const;

export interface BodyMetricsValues {
  weight: string;
  waist: string;
  steps: string;
  exerciseMinutes: string;
  walkRunDistance: string;
  sleepHours: string;
}

interface FieldConfig {
  key: keyof BodyMetricsValues;
  label: string;
  unit: string;
  testID: string;
}

const FIELDS: FieldConfig[] = [
  { key: 'weight', label: 'Weight', unit: 'kg', testID: 'checkin-weight-input' },
  { key: 'waist', label: 'Waist', unit: 'cm', testID: 'checkin-waist-input' },
  { key: 'steps', label: 'Steps', unit: '', testID: 'checkin-steps-input' },
  { key: 'exerciseMinutes', label: 'Exercise', unit: 'min', testID: 'checkin-exercise-input' },
  { key: 'walkRunDistance', label: 'Walk/Run', unit: 'km', testID: 'checkin-walkrun-input' },
  { key: 'sleepHours', label: 'Sleep', unit: 'hrs', testID: 'checkin-sleep-input' },
];

interface BodyMetricsSectionProps {
  values: BodyMetricsValues;
  onChange(values: BodyMetricsValues): void;
}

export function BodyMetricsSection({ values, onChange }: BodyMetricsSectionProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {FIELDS.map(({ key, label, unit, testID }) => (
        <View key={key} className="flex-1 min-w-[44%] gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            {label}
            {unit ? <Text className="text-foreground/40"> {unit}</Text> : null}
          </Text>
          <TextInput
            testID={testID}
            value={values[key]}
            onChangeText={(text) => onChange({ ...values, [key]: text })}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={COLORS.placeholder}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
          />
        </View>
      ))}
    </View>
  );
}

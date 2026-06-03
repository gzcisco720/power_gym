import React from 'react';
import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';

const COLORS = { primary: '#4f46e5', primaryLight: '#818cf8', track: '#1f1f1f' } as const;

export interface WellnessValues {
  sleepQuality: number;
  energy: number;
  recovery: number;
  stress: number;
  fatigue: number;
  hunger: number;
  digestion: number;
}

const SLIDER_FIELDS: { key: keyof WellnessValues; label: string }[] = [
  { key: 'sleepQuality', label: 'Sleep Quality' },
  { key: 'energy', label: 'Energy' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'digestion', label: 'Digestion' },
];

interface WellnessSlidersProps {
  values: WellnessValues;
  onChange(values: WellnessValues): void;
}

export function WellnessSliders({ values, onChange }: WellnessSlidersProps) {
  function handleChange(key: keyof WellnessValues, value: number) {
    onChange({ ...values, [key]: Math.round(value) });
  }

  return (
    <View className="gap-4">
      {SLIDER_FIELDS.map(({ key, label }) => (
        <View key={key}>
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[13px] text-foreground/65">{label}</Text>
            <Text className="text-[13px] font-semibold text-primary-light">
              {values[key]} / 10
            </Text>
          </View>
          <Slider
            testID={`slider-${key}`}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={values[key]}
            onValueChange={(v) => handleChange(key, v)}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.track}
            thumbTintColor={COLORS.primaryLight}
          />
        </View>
      ))}
    </View>
  );
}

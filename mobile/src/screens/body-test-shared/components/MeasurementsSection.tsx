import React from 'react';
import { View, Text } from 'react-native';
import { Input } from '~/components/ui/input';
import { Protocol, Sex } from '../../../types/body-tests';

interface MeasurementField {
  key: string;
  label: string;
}

const SITE_3_MALE: MeasurementField[] = [
  { key: 'chest', label: 'Chest (mm)' },
  { key: 'abdominal', label: 'Abdominal (mm)' },
  { key: 'thigh', label: 'Thigh (mm)' },
];

const SITE_3_FEMALE: MeasurementField[] = [
  { key: 'tricep', label: 'Tricep (mm)' },
  { key: 'suprailiac', label: 'Suprailiac (mm)' },
  { key: 'thigh', label: 'Thigh (mm)' },
];

const SITE_7: MeasurementField[] = [
  { key: 'chest', label: 'Chest (mm)' },
  { key: 'midaxillary', label: 'Midaxillary (mm)' },
  { key: 'tricep', label: 'Tricep (mm)' },
  { key: 'subscapular', label: 'Subscapular (mm)' },
  { key: 'abdominal', label: 'Abdominal (mm)' },
  { key: 'suprailiac', label: 'Suprailiac (mm)' },
  { key: 'thigh', label: 'Thigh (mm)' },
];

const SITE_9: MeasurementField[] = [
  { key: 'tricep', label: 'Tricep (mm)' },
  { key: 'chest', label: 'Chest (mm)' },
  { key: 'subscapular', label: 'Subscapular (mm)' },
  { key: 'abdominal', label: 'Abdominal (mm)' },
  { key: 'suprailiac', label: 'Suprailiac (mm)' },
  { key: 'thigh', label: 'Thigh (mm)' },
  { key: 'midaxillary', label: 'Midaxillary (mm)' },
  { key: 'bicep', label: 'Bicep (mm)' },
  { key: 'lumbar', label: 'Lumbar (mm)' },
];

interface MeasurementsSectionProps {
  protocol: Protocol;
  sex: Sex | null;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function MeasurementsSection({
  protocol,
  sex,
  values,
  onChange,
}: MeasurementsSectionProps) {
  if (protocol === 'other') {
    return (
      <View className="gap-3">
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Body Fat %
          </Text>
          <Input
            testID="measurement-bodyFatPct"
            value={values['bodyFatPct'] ?? ''}
            onChangeText={(v) => onChange('bodyFatPct', v)}
            keyboardType="decimal-pad"
            placeholder="e.g. 18.5"
            placeholderTextColor="rgba(255,255,255,0.3)"
            className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            accessibilityLabel="Body fat percentage"
          />
        </View>
      </View>
    );
  }

  let fields: MeasurementField[];
  if (protocol === '3site') {
    fields = sex === 'female' ? SITE_3_FEMALE : SITE_3_MALE;
  } else if (protocol === '7site') {
    fields = SITE_7;
  } else {
    fields = SITE_9;
  }

  return (
    <View className="gap-3">
      {fields.map(({ key, label }) => (
        <View key={key} className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            {label}
          </Text>
          <Input
            testID={`measurement-${key}`}
            value={values[key] ?? ''}
            onChangeText={(v) => onChange(key, v)}
            keyboardType="decimal-pad"
            placeholder="mm"
            placeholderTextColor="rgba(255,255,255,0.3)"
            className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            accessibilityLabel={label}
          />
        </View>
      ))}
    </View>
  );
}

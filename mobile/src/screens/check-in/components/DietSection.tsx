import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Input } from '~/components/ui/input';
import { StuckToDiet } from '../../../types/check-ins';

const DIET_OPTIONS: { value: StuckToDiet; label: string; testID: string }[] = [
  { value: 'yes', label: 'Yes', testID: 'checkin-diet-yes' },
  { value: 'partial', label: 'Partial', testID: 'checkin-diet-partial' },
  { value: 'no', label: 'No', testID: 'checkin-diet-no' },
];

export interface DietValues {
  stuckToDiet: StuckToDiet | null;
  dietDetails: string;
  wellbeing: string;
  notes: string;
}

interface DietSectionProps {
  values: DietValues;
  onChange(values: DietValues): void;
}

export function DietSection({ values, onChange }: DietSectionProps) {
  return (
    <View className="gap-3">
      {/* Stuck to diet toggle */}
      <View className="gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Stuck to diet? <Text className="text-destructive">*</Text>
        </Text>
        <View className="flex-row gap-2">
          {DIET_OPTIONS.map((opt) => {
            const isSelected = values.stuckToDiet === opt.value;
            return (
              <Pressable
                key={opt.value}
                testID={opt.testID}
                onPress={() => onChange({ ...values, stuckToDiet: opt.value })}
                accessibilityLabel={opt.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                className={`flex-1 items-center py-2 rounded-xl border ${
                  isSelected ? 'border-primary bg-primary/10' : 'border-foreground/10 bg-input'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isSelected ? 'text-primary-light' : 'text-foreground/65'
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Diet details */}
      <View className="gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Diet Details <Text className="text-foreground/65">(optional)</Text>
        </Text>
        <Input
          value={values.dietDetails}
          onChangeText={(text) => onChange({ ...values, dietDetails: text })}
          placeholder="What did you eat?"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Wellbeing */}
      <View className="gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Wellbeing <Text className="text-foreground/65">(optional)</Text>
        </Text>
        <Input
          value={values.wellbeing}
          onChangeText={(text) => onChange({ ...values, wellbeing: text })}
          placeholder="How are you feeling overall?"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Notes */}
      <View className="gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Notes <Text className="text-foreground/65">(optional)</Text>
        </Text>
        <Input
          value={values.notes}
          onChangeText={(text) => onChange({ ...values, notes: text })}
          placeholder="Anything else to note?"
          multiline
          numberOfLines={2}
        />
      </View>
    </View>
  );
}

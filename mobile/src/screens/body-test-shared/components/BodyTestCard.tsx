import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BodyTest, PROTOCOL_LABELS } from '../../../types/body-tests';

interface BodyTestCardProps {
  bodyTest: BodyTest;
  onPress: (bodyTest: BodyTest) => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BodyTestCard({ bodyTest, onPress }: BodyTestCardProps) {
  return (
    <Pressable
      testID={`body-test-card-${bodyTest._id}`}
      onPress={() => onPress(bodyTest)}
      accessibilityLabel={`Body test from ${formatDate(bodyTest.date)}, ${bodyTest.bodyFatPct.toFixed(1)}% body fat`}
      accessibilityRole="button"
      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">
          {formatDate(bodyTest.date)}
        </Text>
        <Text className="text-[18px] font-semibold text-primary-light">
          {bodyTest.bodyFatPct.toFixed(1)}%
        </Text>
      </View>
      <View className="flex-row items-center justify-between mt-0.5">
        <Text className="text-[11px] text-foreground/65">
          {PROTOCOL_LABELS[bodyTest.protocol]}
        </Text>
        <Text className="text-[11px] text-foreground/65">
          {bodyTest.leanMassKg.toFixed(1)} kg lean
        </Text>
      </View>
    </Pressable>
  );
}

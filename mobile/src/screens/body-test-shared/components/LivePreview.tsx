import React from 'react';
import { View, Text } from 'react-native';

interface LivePreviewProps {
  bodyFatPct: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
}

export function LivePreview({ bodyFatPct, fatMassKg, leanMassKg }: LivePreviewProps) {
  const hasValue = bodyFatPct !== null;

  return (
    <View className="rounded-xl bg-primary/10 ring-1 ring-primary/20 px-4 py-3 gap-2">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Live Preview
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text
          testID="bodytest-preview-bodyfat"
          className="text-[24px] font-semibold text-primary-light"
        >
          {hasValue ? `${bodyFatPct!.toFixed(1)}%` : '—'}
        </Text>
        {hasValue && (
          <Text className="text-sm text-foreground/65"> body fat</Text>
        )}
      </View>
      {hasValue && fatMassKg !== null && leanMassKg !== null && (
        <View className="flex-row gap-4">
          <Text className="text-xs text-foreground/65">
            Fat Mass:{' '}
            <Text className="text-xs font-semibold text-foreground">
              {fatMassKg.toFixed(1)} kg
            </Text>
          </Text>
          <Text className="text-xs text-foreground/65">
            Lean Mass:{' '}
            <Text className="text-xs font-semibold text-foreground">
              {leanMassKg.toFixed(1)} kg
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

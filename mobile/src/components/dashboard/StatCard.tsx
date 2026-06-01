import React from 'react';
import { View, Text } from 'react-native';

type DeltaVariant = 'success' | 'danger' | 'warning' | 'muted';

const DELTA_CLASSES: Record<DeltaVariant, string> = {
  success: 'text-emerald-400',
  danger: 'text-red-400',
  warning: 'text-amber-400',
  muted: 'text-foreground/40',
};

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaVariant?: DeltaVariant;
  testID?: string;
}

export function StatCard({ label, value, delta, deltaVariant = 'muted', testID }: StatCardProps) {
  return (
    <View
      testID={testID}
      className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3"
    >
      <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
        {label}
      </Text>
      <Text className="mt-1.5 text-[22px] font-bold leading-none text-foreground tabular-nums">
        {value}
      </Text>
      {delta !== undefined && (
        <Text
          testID={testID ? `${testID}-delta` : 'stat-card-delta'}
          className={`mt-1 text-[9px] ${DELTA_CLASSES[deltaVariant]}`}
        >
          {delta}
        </Text>
      )}
    </View>
  );
}

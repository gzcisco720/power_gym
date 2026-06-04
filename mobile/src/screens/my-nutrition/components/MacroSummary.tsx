import React from 'react';
import { View, Text } from 'react-native';
import { MacroTotals } from '../../../types/nutrition';

interface MacroSummaryProps {
  logged: MacroTotals;
  target: MacroTotals;
}

interface MacroRowProps {
  label: string;
  logged: number;
  target: number;
  unit?: string;
  labelClass: string;
  valueClass: string;
}

function MacroRow({ label, logged, target, unit = 'g', labelClass, valueClass }: MacroRowProps) {
  return (
    <View className="items-center gap-0.5">
      <Text className={`text-[10px] font-semibold uppercase tracking-wider ${labelClass}`}>
        {label}
      </Text>
      <Text className={`text-[13px] font-semibold tabular-nums ${valueClass}`}>{logged}</Text>
      <Text className="text-[10px] text-foreground/40 tabular-nums">/ {target}{unit}</Text>
    </View>
  );
}

export function MacroSummary({ logged, target }: MacroSummaryProps) {
  return (
    <View
      testID="macro-summary"
      className="mx-4 mt-4 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3"
    >
      <View className="flex-row items-center justify-between">
        {/* kcal — primary stat */}
        <View className="items-center gap-0.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-foreground/65">
            kcal
          </Text>
          <Text className="text-[18px] font-semibold tabular-nums text-foreground">
            {logged.kcal}
          </Text>
          <View className="flex-row items-center gap-0.5">
            <Text className="text-[10px] text-foreground/40">/ </Text>
            <Text className="text-[10px] text-foreground/40 tabular-nums">{target.kcal}</Text>
          </View>
        </View>

        {/* divider */}
        <View className="w-px h-10 bg-foreground/10" />

        {/* protein */}
        <MacroRow
          label="protein"
          logged={logged.protein}
          target={target.protein}
          labelClass="text-emerald-300"
          valueClass="text-emerald-300"
        />

        {/* carbs */}
        <MacroRow
          label="carbs"
          logged={logged.carbs}
          target={target.carbs}
          labelClass="text-amber-300"
          valueClass="text-amber-300"
        />

        {/* fat */}
        <MacroRow
          label="fat"
          logged={logged.fat}
          target={target.fat}
          labelClass="text-pink-300"
          valueClass="text-pink-300"
        />
      </View>
    </View>
  );
}

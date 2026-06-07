import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { BodyTest } from '../../../types/body-tests';
import { BodyTestCard } from '../../body-test-shared/components/BodyTestCard';

interface MemberBodyTestsTabProps {
  bodyTests: BodyTest[];
  onPressBodyTest: (bodyTest: BodyTest) => void;
}

function BodyCompositionTrend({ bodyTests }: { bodyTests: BodyTest[] }) {
  const sorted = [...bodyTests]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-8);
  if (sorted.length < 2) return null;

  const maxBf = Math.max(...sorted.map((t) => t.bodyFatPct));
  const minBf = Math.min(...sorted.map((t) => t.bodyFatPct));
  const rangeBf = maxBf - minBf || 1;

  const maxW = Math.max(...sorted.map((t) => t.weight));
  const minW = Math.min(...sorted.map((t) => t.weight));
  const rangeW = maxW - minW || 1;

  return (
    <View
      testID="body-composition-trend"
      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3 gap-3"
    >
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Body Composition Trend
      </Text>
      <View className="flex-row items-end justify-between gap-1.5 h-16">
        {sorted.map((t) => {
          const bfH = ((t.bodyFatPct - minBf) / rangeBf) * 48 + 8;
          const wH = ((t.weight - minW) / rangeW) * 48 + 8;
          return (
            <View key={t._id} className="flex-1 flex-row items-end gap-0.5">
              <View
                testID={`trend-bf-${t._id}`}
                className="flex-1 bg-rose-400/50 rounded-sm"
                style={{ height: bfH }}
              />
              <View
                testID={`trend-w-${t._id}`}
                className="flex-1 bg-primary/40 rounded-sm"
                style={{ height: wH }}
              />
            </View>
          );
        })}
      </View>
      <View className="flex-row gap-3">
        <View className="flex-row items-center gap-1">
          <View className="w-2.5 h-2.5 rounded-sm bg-rose-400/50" />
          <Text className="text-[10px] text-foreground/40">Body Fat %</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="w-2.5 h-2.5 rounded-sm bg-primary/40" />
          <Text className="text-[10px] text-foreground/40">Weight</Text>
        </View>
      </View>
    </View>
  );
}

export function MemberBodyTestsTab({ bodyTests, onPressBodyTest }: MemberBodyTestsTabProps) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Trend chart (2+ tests) */}
        <BodyCompositionTrend bodyTests={bodyTests} />

        {/* Test list */}
        <View className="gap-2">
          {bodyTests.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No body tests recorded yet.
            </Text>
          ) : (
            [...bodyTests]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((bt) => (
                <BodyTestCard key={bt._id} bodyTest={bt} onPress={onPressBodyTest} />
              ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

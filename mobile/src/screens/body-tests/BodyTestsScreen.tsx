import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useBodyTestsStore } from '../../stores/body-tests.store';
import { BodyTest } from '../../types/body-tests';
import { BodyTestCard } from '../body-test-shared/components/BodyTestCard';
import { AppStackParamList } from '../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

function formatDelta(value: number, suffix: string): { text: string; className: string } {
  const abs = Math.abs(value).toFixed(1);
  const sign = value > 0 ? '+' : '−';
  const className = value < 0 ? 'text-emerald-300' : value > 0 ? 'text-rose-300' : 'text-foreground/65';
  return { text: `${sign}${abs}${suffix}`, className };
}

export function BodyTestsScreen() {
  const navigation = useNavigation<Nav>();
  const { items, loading, fetchMyBodyTests } = useBodyTestsStore();

  useEffect(() => {
    void fetchMyBodyTests();
  }, [fetchMyBodyTests]);

  function handleCardPress(bodyTest: BodyTest) {
    navigation.navigate('BodyTestDetail', { bodyTest });
  }

  const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sorted[0] ?? null;
  const previous = sorted[1] ?? null;

  return (
    <Screen testID="screen-BodyTests">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Body Tests
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">
            Body composition history
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-4">
          {/* Latest test KPI strip */}
          {latest && (
            <View className="gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                Latest Test
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  {
                    label: 'Weight',
                    value: `${latest.weight.toFixed(1)}`,
                    unit: 'kg',
                    delta: previous ? formatDelta(latest.weight - previous.weight, ' kg') : null,
                    testID: 'body-test-kpi-weight',
                  },
                  {
                    label: 'Body Fat',
                    value: `${latest.bodyFatPct.toFixed(1)}`,
                    unit: '%',
                    delta: previous ? formatDelta(latest.bodyFatPct - previous.bodyFatPct, '%') : null,
                    testID: 'body-test-kpi-bf',
                  },
                  {
                    label: 'Lean Mass',
                    value: `${latest.leanMassKg.toFixed(1)}`,
                    unit: 'kg',
                    delta: previous ? formatDelta(latest.leanMassKg - previous.leanMassKg, ' kg') : null,
                    testID: 'body-test-kpi-lean',
                  },
                  {
                    label: 'Fat Mass',
                    value: `${latest.fatMassKg.toFixed(1)}`,
                    unit: 'kg',
                    delta: previous ? formatDelta(latest.fatMassKg - previous.fatMassKg, ' kg') : null,
                    testID: 'body-test-kpi-fat',
                  },
                ].map(({ label, value, unit, delta, testID }) => (
                  <View
                    key={label}
                    testID={testID}
                    className="flex-1 min-w-[44%] rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3"
                  >
                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                      {label}
                    </Text>
                    <Text className="text-[18px] font-semibold tabular-nums text-foreground mt-1">
                      {value}
                      <Text className="text-xs font-medium text-foreground/65"> {unit}</Text>
                    </Text>
                    {delta && (
                      <Text className={`text-xs mt-0.5 tabular-nums ${delta.className}`}>
                        {delta.text}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Test history list */}
          <View className="gap-2">
            {items.length > 0 && (
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                History
              </Text>
            )}
            {loading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <View key={i} className="rounded-xl bg-muted px-3 py-2 h-14 opacity-60" />
                ))}
              </>
            ) : items.length === 0 ? (
              <Text className="text-[13px] text-foreground/65 text-center mt-4">
                No body tests recorded yet.
              </Text>
            ) : (
              sorted.map((item) => (
                <BodyTestCard key={item._id} bodyTest={item} onPress={handleCardPress} />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

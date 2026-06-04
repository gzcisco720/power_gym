import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { fetchMemberNutritionHistory } from '../../../lib/api/nutrition.api';
import { ActiveNutritionPlan, NutritionDailyLog } from '../../../types/nutrition';

interface MemberNutritionTabProps {
  memberId: string;
  activePlan: ActiveNutritionPlan | null;
  onAssignPress: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MemberNutritionTab({
  memberId,
  activePlan,
  onAssignPress,
}: MemberNutritionTabProps) {
  const [history, setHistory] = useState<NutritionDailyLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchMemberNutritionHistory(memberId)
      .then((logs) => setHistory(logs))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [memberId]);

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Active plan section */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Active Nutrition Plan
          </Text>

          {activePlan ? (
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">{activePlan.name}</Text>
              <Pressable
                testID="assign-nutrition-plan-button"
                onPress={onAssignPress}
                accessibilityLabel="Reassign nutrition plan"
                accessibilityRole="button"
                className="rounded-lg bg-muted px-2.5 py-1"
              >
                <Text className="text-xs text-foreground/65">Reassign</Text>
              </Pressable>
            </View>
          ) : (
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between">
              <Text className="text-sm text-foreground/65">No plan assigned</Text>
              <Pressable
                testID="assign-nutrition-plan-button"
                onPress={onAssignPress}
                accessibilityLabel="Assign nutrition plan"
                accessibilityRole="button"
                className="rounded-lg bg-primary px-2.5 py-1"
              >
                <Text className="text-xs font-semibold text-foreground">Assign</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Nutrition log history section */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Log History
          </Text>

          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <View key={i} className="rounded-xl bg-muted h-12 opacity-60" />
              ))}
            </>
          ) : history.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-2">
              No nutrition logs yet.
            </Text>
          ) : (
            history.map((log) => (
              <View
                key={log._id}
                testID={`nutrition-log-${log._id}`}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-foreground">
                    {log.dayTypeName}
                  </Text>
                  <Text className="text-xs text-foreground/65 ml-2">
                    {formatDate(log.date)}
                  </Text>
                </View>
                <Text className="text-xs text-foreground/65 mt-0.5">
                  {log.meals.reduce((total, meal) => total + meal.items.length, 0)} items logged
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { fetchMemberNutritionHistory, fetchMemberNutritionPlan } from '../../../lib/api/nutrition.api';
import { ActiveNutritionPlan, DayType, MemberNutritionPlan, MealItem, NutritionDailyLog } from '../../../types/nutrition';

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

interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

function sumItems(items: MealItem[]): MacroTotals {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function computeDayTypeTotals(dayType: DayType): MacroTotals {
  const allItems = dayType.meals.flatMap((m) => m.items);
  return sumItems(allItems);
}

function computeLogActuals(log: NutritionDailyLog): MacroTotals {
  const allItems = log.meals.flatMap((m) => m.items);
  return sumItems(allItems);
}

function logHasItems(log: NutritionDailyLog): boolean {
  return log.meals.some((m) => m.items.length > 0);
}

interface DayTypeCardProps {
  dayType: DayType;
}

function DayTypeCard({ dayType }: DayTypeCardProps) {
  const totals = computeDayTypeTotals(dayType);
  return (
    <View
      testID={`day-type-card-${dayType.name}`}
      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-2"
    >
      <Text className="text-sm font-medium text-foreground">{dayType.name}</Text>
      <View className="flex-row items-center gap-2 flex-wrap">
        <Text
          testID={`day-type-kcal-${dayType.name}`}
          className="text-xs font-semibold text-foreground"
        >
          {`${Math.round(totals.kcal)} kcal`}
        </Text>
        <View className="rounded-full bg-emerald-500/10 px-2 py-0.5">
          <Text
            testID={`day-type-protein-${dayType.name}`}
            className="text-[10px] font-medium text-emerald-300"
          >
            {`P ${Math.round(totals.protein)}g`}
          </Text>
        </View>
        <View className="rounded-full bg-amber-500/10 px-2 py-0.5">
          <Text
            testID={`day-type-carbs-${dayType.name}`}
            className="text-[10px] font-medium text-amber-300"
          >
            {`C ${Math.round(totals.carbs)}g`}
          </Text>
        </View>
        <View className="rounded-full bg-pink-500/10 px-2 py-0.5">
          <Text
            testID={`day-type-fat-${dayType.name}`}
            className="text-[10px] font-medium text-pink-300"
          >
            {`F ${Math.round(totals.fat)}g`}
          </Text>
        </View>
      </View>
    </View>
  );
}

interface LogRowProps {
  log: NutritionDailyLog;
  planDayType: DayType | null;
}

function LogRow({ log, planDayType }: LogRowProps) {
  const actuals = computeLogActuals(log);
  const target = planDayType ? computeDayTypeTotals(planDayType) : null;
  const isLogged = logHasItems(log);

  return (
    <View
      testID={`nutrition-log-${log._id}`}
      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-1.5"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">{log.dayTypeName}</Text>
        <View className="flex-row items-center gap-2">
          {isLogged ? (
            <View
              testID={`log-logged-indicator-${log._id}`}
              className="rounded-full bg-emerald-500/10 px-2 py-0.5"
            >
              <Text className="text-[10px] font-medium text-emerald-300">Logged</Text>
            </View>
          ) : null}
          <Text className="text-xs text-foreground/65">{formatDate(log.date)}</Text>
        </View>
      </View>

      {/* Actual vs target macros */}
      <View className="flex-row items-center gap-1.5 flex-wrap">
        <Text testID={`log-actual-kcal-${log._id}`} className="text-xs font-semibold text-foreground">
          {`${Math.round(actuals.kcal)} kcal`}
        </Text>
        {target !== null ? (
          <Text testID={`log-target-kcal-${log._id}`} className="text-xs text-foreground/40">
            {`/ ${Math.round(target.kcal)}`}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-2 flex-wrap">
        <Text className="text-xs text-foreground/65">
          {`P ${Math.round(actuals.protein)}g`}
        </Text>
        <Text className="text-xs text-foreground/65">
          {`C ${Math.round(actuals.carbs)}g`}
        </Text>
        <Text className="text-xs text-foreground/65">
          {`F ${Math.round(actuals.fat)}g`}
        </Text>
        {target !== null ? (
          <Text className="text-xs text-foreground/40">
            {`/ P${Math.round(target.protein)} C${Math.round(target.carbs)} F${Math.round(target.fat)}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function MemberNutritionTab({
  memberId,
  activePlan,
  onAssignPress,
}: MemberNutritionTabProps) {
  const [history, setHistory] = useState<NutritionDailyLog[]>([]);
  const [memberPlan, setMemberPlan] = useState<MemberNutritionPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchMemberNutritionHistory(memberId).catch(() => [] as NutritionDailyLog[]),
      fetchMemberNutritionPlan(memberId).catch(() => null),
    ])
      .then(([logs, plan]) => {
        setHistory(logs);
        setMemberPlan(plan);
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  // Build a dayTypeName → DayType map for fast lookup
  const dayTypeMap = new Map<string, DayType>(
    (memberPlan?.dayTypes ?? []).map((dt) => [dt.name, dt]),
  );

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

        {/* Day-type macro target cards */}
        {memberPlan !== null && memberPlan.dayTypes.length > 0 ? (
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Day Type Targets
            </Text>
            {memberPlan.dayTypes.map((dt) => (
              <DayTypeCard key={dt.name} dayType={dt} />
            ))}
          </View>
        ) : null}

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
              <LogRow
                key={log._id}
                log={log}
                planDayType={dayTypeMap.get(log.dayTypeName) ?? null}
              />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

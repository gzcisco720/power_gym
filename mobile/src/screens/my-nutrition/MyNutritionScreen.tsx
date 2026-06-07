import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useNutritionStore } from '../../stores/nutrition.store';
import { MacroSummary } from './components/MacroSummary';
import { MealCard } from './components/MealCard';
import { AppStackParamList } from '../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList>;

export function MyNutritionScreen() {
  const navigation = useNavigation<Nav>();
  const plan = useNutritionStore((s) => s.plan);
  const todayLog = useNutritionStore((s) => s.todayLog);
  const summary = useNutritionStore((s) => s.summary);
  const history = useNutritionStore((s) => s.history);
  const loading = useNutritionStore((s) => s.loading);
  const fetchToday = useNutritionStore((s) => s.fetchToday);

  // Activity stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayISO = now.toISOString().slice(0, 10);
  const monthDays = history.filter((d) => d.date >= startOfMonth.toISOString().slice(0, 10) && d.date <= todayISO);
  const loggedMonthDays = monthDays.filter((d) => d.logged);
  const monthDaysLogged = loggedMonthDays.length;
  const avgKcal = monthDaysLogged > 0
    ? Math.round(loggedMonthDays.reduce((s, d) => s + d.loggedKcal, 0) / monthDaysLogged)
    : null;

  useEffect(() => {
    void fetchToday();
  }, [fetchToday]);

  return (
    <Screen testID="screen-MyNutrition">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            My Nutrition
          </Text>
          {plan ? (
            <Text className="mt-0.5 text-[12px] text-foreground/65">{plan.name}</Text>
          ) : null}
        </View>
      </View>

      {/* Activity strip — last 14 days + this-month stats (shown when history exists) */}
      {history.length > 0 && (
        <View
          testID="nutrition-activity-strip"
          className="flex-row items-center justify-between px-4 py-2 border-b border-foreground/[.06]"
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-[10px] uppercase tracking-[1.5px] font-bold text-foreground/65">
              14d
            </Text>
            <View className="flex-row gap-[3px]">
              {history.map((day) => (
                <View
                  key={day.date}
                  className={`w-3 h-3 rounded-sm ${day.logged ? 'bg-emerald-500/65' : 'bg-foreground/[0.08]'}`}
                />
              ))}
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <Text
              testID="nutrition-strip-days-logged"
              className="text-[11px] text-foreground/65 tabular-nums"
            >
              <Text className="text-foreground font-semibold">{monthDaysLogged}</Text>
              {' days'}
            </Text>
            {avgKcal !== null && (
              <Text className="text-[11px] text-foreground/65 tabular-nums">
                <Text className="text-foreground font-semibold">{avgKcal}</Text>
                {' avg kcal'}
              </Text>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 py-4 gap-2">
            {[0, 1, 2].map((i) => (
              <View key={i} className="rounded-xl bg-muted h-16 opacity-60" />
            ))}
          </View>
        </ScrollView>
      ) : plan === null ? (
        <View testID="my-nutrition-empty" className="flex-1 items-center justify-center px-4 gap-4">
          <View className="items-center">
            <Text className="text-[15px] font-semibold text-foreground text-center">
              No nutrition plan assigned
            </Text>
            <Text className="text-[13px] text-foreground/65 text-center mt-1">
              Ask your trainer to assign a nutrition plan.
            </Text>
          </View>
          <Pressable
            testID="log-freely-cta"
            onPress={() => navigation.navigate('FreeLog')}
            accessibilityLabel="Log food freely"
            accessibilityRole="button"
            className="rounded-xl bg-primary px-6 py-3 items-center"
          >
            <Text className="text-sm font-semibold text-foreground">Log freely</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Macro summary */}
          {summary ? (
            <MacroSummary logged={summary.logged} target={summary.target} />
          ) : null}

          {/* Day type label */}
          {todayLog ? (
            <View
              testID={`nutrition-day-type-${todayLog.dayTypeName}`}
              className="mx-4 mt-4 mb-1"
            >
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                {todayLog.dayTypeName}
              </Text>
            </View>
          ) : null}

          {/* Meal cards */}
          <View className="px-4 gap-2">
            {(todayLog?.meals ?? []).map((meal) => (
              <MealCard key={`${meal.name}-${meal.order}`} meal={meal} />
            ))}
          </View>

          {/* Log freely secondary option */}
          <View className="px-4 pt-4 pb-24">
            <Pressable
              testID="log-freely-option"
              onPress={() => navigation.navigate('FreeLog')}
              accessibilityLabel="Log food freely"
              accessibilityRole="button"
              className="rounded-xl bg-muted ring-1 ring-foreground/10 px-4 py-3 flex-row items-center justify-between"
            >
              <Text className="text-sm font-medium text-foreground">Log freely</Text>
              <Text className="text-sm text-foreground/65">→</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

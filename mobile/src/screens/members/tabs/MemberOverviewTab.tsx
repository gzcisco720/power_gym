import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { MemberOverviewStats } from '../../../types/members';
import { TrainingHeatmap } from '../components/TrainingHeatmap';
import { Skeleton } from '~/components/ui/skeleton';

type TabId = 'overview' | 'bodytests' | 'health';

interface MemberOverviewTabProps {
  overviewStats: MemberOverviewStats | null;
  onNavigateToTab: (tab: TabId) => void;
  loading?: boolean;
}

function formatDelta(value: number, suffix: string): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}${suffix}`;
}

export function MemberOverviewTab({ overviewStats, onNavigateToTab, loading }: MemberOverviewTabProps) {
  if (loading) {
    return (
      <View testID="overview-skeleton" className="px-4 py-4 gap-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* KPI Strip */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            This Month
          </Text>
          <View className="flex-row gap-2">
            {/* Sessions This Month */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
              <Text className="text-[11px] text-foreground/65 uppercase tracking-wider">
                Sessions
              </Text>
              <Text
                testID="kpi-sessions"
                className="text-2xl font-semibold tabular-nums text-foreground mt-1"
              >
                {overviewStats?.sessionsThisMonth ?? 0}
              </Text>
            </View>

            {/* Weight */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
              <Text className="text-[11px] text-foreground/65 uppercase tracking-wider">
                Weight
              </Text>
              {overviewStats?.weight ? (
                <>
                  <Text
                    testID="kpi-weight-value"
                    className="text-2xl font-semibold tabular-nums text-foreground mt-1"
                  >
                    {overviewStats.weight.value.toFixed(1)}
                    <Text className="text-sm font-medium text-foreground/65"> kg</Text>
                  </Text>
                  <Text
                    testID="kpi-weight-delta"
                    className={`text-xs mt-0.5 ${
                      overviewStats.weight.deltaKg <= 0 ? 'text-emerald-300' : 'text-pink-300'
                    }`}
                  >
                    {formatDelta(overviewStats.weight.deltaKg, ' kg')}
                  </Text>
                </>
              ) : (
                <Text
                  testID="kpi-weight-value"
                  className="text-sm text-foreground/65 mt-1"
                >
                  —
                </Text>
              )}
            </View>
          </View>

          <View className="flex-row gap-2">
            {/* Body Fat */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
              <Text className="text-[11px] text-foreground/65 uppercase tracking-wider">
                Body Fat
              </Text>
              {overviewStats?.bodyFat ? (
                <>
                  <Text
                    testID="kpi-bodyfat-value"
                    className="text-2xl font-semibold tabular-nums text-foreground mt-1"
                  >
                    {overviewStats.bodyFat.pct.toFixed(1)}
                    <Text className="text-sm font-medium text-foreground/65"> %</Text>
                  </Text>
                  <Text
                    testID="kpi-bodyfat-delta"
                    className={`text-xs mt-0.5 ${
                      overviewStats.bodyFat.deltaPct <= 0 ? 'text-emerald-300' : 'text-pink-300'
                    }`}
                  >
                    {formatDelta(overviewStats.bodyFat.deltaPct, '%')}
                  </Text>
                </>
              ) : (
                <Text
                  testID="kpi-bodyfat-value"
                  className="text-sm text-foreground/65 mt-1"
                >
                  —
                </Text>
              )}
            </View>

            {/* Top PR */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
              <Text className="text-[11px] text-foreground/65 uppercase tracking-wider">
                Top PR
              </Text>
              {overviewStats?.topPR ? (
                <>
                  <Text
                    testID="kpi-top-pr-value"
                    className="text-2xl font-semibold tabular-nums text-foreground mt-1"
                  >
                    {overviewStats.topPR.estimatedOneRM}
                    <Text className="text-sm font-medium text-foreground/65"> kg</Text>
                  </Text>
                  <Text
                    testID="kpi-top-pr-name"
                    className="text-xs text-foreground/65 mt-0.5"
                    numberOfLines={1}
                  >
                    {overviewStats.topPR.exerciseName}
                  </Text>
                </>
              ) : (
                <Text
                  testID="kpi-top-pr-value"
                  className="text-sm text-foreground/65 mt-1"
                >
                  —
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Active Plan */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Active Plan
          </Text>
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
            {overviewStats?.activePlan ? (
              <View testID="active-plan-card" className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-foreground">
                  {overviewStats.activePlan.name}
                </Text>
                <View className="bg-primary/10 rounded-full px-2 py-0.5">
                  <Text className="text-[10px] font-medium text-primary-light">
                    {overviewStats.activePlan.dayCount} days
                  </Text>
                </View>
              </View>
            ) : (
              <Text
                testID="active-plan-empty"
                className="text-sm text-foreground/65"
              >
                No plan assigned
              </Text>
            )}
          </View>
        </View>

        {/* Health Summary */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Health
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
              <Text className="text-[11px] text-foreground/65 uppercase tracking-wider">
                Active Injuries
              </Text>
              <Text
                testID="health-injury-count"
                className={`text-2xl font-semibold tabular-nums mt-1 ${
                  (overviewStats?.activeInjuryCount ?? 0) > 0
                    ? 'text-amber-300'
                    : 'text-foreground'
                }`}
              >
                {overviewStats?.activeInjuryCount ?? 0}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
              <Text className="text-[11px] text-foreground/65 uppercase tracking-wider">
                Medications
              </Text>
              <Text
                testID="health-medication-count"
                className="text-2xl font-semibold tabular-nums text-foreground mt-1"
              >
                {overviewStats?.activeMedicationCount ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Weight Trend mini chart (label only — gifted-charts renders natively) */}
        {overviewStats?.weightTrend && overviewStats.weightTrend.length > 0 ? (
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Weight Trend
            </Text>
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
              <View className="flex-row items-end justify-between gap-1">
                {overviewStats.weightTrend.map((pt) => {
                  const max = Math.max(...overviewStats.weightTrend.map((p) => p.weight));
                  const min = Math.min(...overviewStats.weightTrend.map((p) => p.weight));
                  const range = max - min || 1;
                  const heightPct = ((pt.weight - min) / range) * 48 + 8;
                  return (
                    <View
                      key={pt.date}
                      testID={`weight-trend-bar-${pt.date}`}
                      className="flex-1 bg-primary/40 rounded-sm"
                      style={{ height: heightPct }}
                    />
                  );
                })}
              </View>
              <View className="flex-row justify-between mt-1">
                {overviewStats.weightTrend.map((pt) => (
                  <Text key={pt.date} className="text-[10px] text-foreground/40 flex-1 text-center">
                    {pt.date.slice(5, 7)}/{pt.date.slice(8, 10)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {/* 90-day Training Heatmap */}
        {overviewStats ? (
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
            <TrainingHeatmap heatmap={overviewStats.heatmap} />
          </View>
        ) : null}

        {/* Quick links */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Quick Access
          </Text>

          <Pressable
            testID="overview-link-bodytests"
            onPress={() => onNavigateToTab('bodytests')}
            accessibilityLabel="Go to Body Tests"
            accessibilityRole="button"
            className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
          >
            <Text className="text-sm font-medium text-foreground">Body Tests</Text>
            <Text className="text-xs text-foreground/65">→</Text>
          </Pressable>

          <Pressable
            testID="overview-link-health"
            onPress={() => onNavigateToTab('health')}
            accessibilityLabel="Go to Health"
            accessibilityRole="button"
            className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
          >
            <Text className="text-sm font-medium text-foreground">Health</Text>
            <Text className="text-xs text-foreground/65">→</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

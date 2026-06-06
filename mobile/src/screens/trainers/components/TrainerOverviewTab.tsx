import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { TrainerDetail } from '../../../types/trainers';
import { useTrainersStore } from '../../../stores/trainers.store';
import { WeeklyScheduleBar } from './WeeklyScheduleBar';
import { SessionsTrendChart } from './SessionsTrendChart';

interface TrainerOverviewTabProps {
  trainerId: string;
  detail: TrainerDetail;
}

interface KpiCellProps {
  testID: string;
  label: string;
  value: number | string;
  unit?: string;
}

function KpiCell({ testID, label, value, unit }: KpiCellProps) {
  return (
    <View testID={testID} className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-1">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65" numberOfLines={1}>
        {label}
      </Text>
      <View className="flex-row items-end gap-0.5">
        <Text className="text-2xl font-semibold leading-none tracking-tight text-foreground">
          {value}
        </Text>
        {unit ? (
          <Text className="text-xs font-medium text-foreground/65 mb-0.5">{unit}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function TrainerOverviewTab({ trainerId, detail }: TrainerOverviewTabProps) {
  const overviewStats = useTrainersStore((s) => s.overviewStats);
  const overviewStatsLoading = useTrainersStore((s) => s.overviewStatsLoading);
  const fetchTrainerOverviewStats = useTrainersStore((s) => s.fetchTrainerOverviewStats);

  useEffect(() => {
    void fetchTrainerOverviewStats(trainerId);
  }, [fetchTrainerOverviewStats, trainerId]);

  if (overviewStatsLoading || !overviewStats) {
    return (
      <View testID="overview-loading" className="px-4 py-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className="rounded-xl bg-muted h-12 opacity-60" />
        ))}
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Trainer email */}
        <Text className="text-xs text-foreground/65">{detail.email}</Text>

        {/* KPI grid — 2 columns × 3 rows */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Overview
          </Text>
          <View className="flex-row gap-2">
            <KpiCell
              testID="kpi-memberCount"
              label="Members"
              value={overviewStats.memberCount}
            />
            <KpiCell
              testID="kpi-sessionsThisMonth"
              label="Sessions/Mo"
              value={overviewStats.sessionsThisMonth}
            />
          </View>
          <View className="flex-row gap-2">
            <KpiCell
              testID="kpi-templateCount"
              label="Templates"
              value={overviewStats.templateCount}
            />
            <KpiCell
              testID="kpi-activeMembersThisMonth"
              label="Active/Mo"
              value={overviewStats.activeMembersThisMonth}
            />
          </View>
          <View className="flex-row gap-2">
            <KpiCell
              testID="kpi-newPRsThisMonth"
              label="New PRs/Mo"
              value={overviewStats.newPRsThisMonth}
            />
            <KpiCell
              testID="kpi-avgStreakDays"
              label="Avg Streak"
              value={overviewStats.avgStreakDays}
              unit="days"
            />
          </View>
        </View>

        {/* Weekly schedule bar chart */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            This Week's Schedule
          </Text>
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
            <WeeklyScheduleBar schedule={overviewStats.weeklySchedule} />
          </View>
        </View>

        {/* 6-month sessions trend */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Sessions Trend
          </Text>
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
            <SessionsTrendChart trend={overviewStats.sessionsTrend} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

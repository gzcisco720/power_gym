import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { BarChart } from 'react-native-gifted-charts';
import { useOwnerDashboardStore } from '../../stores/owner-dashboard.store';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardSkeleton } from '../../components/dashboard/DashboardSkeleton';
import { EquipmentStatusItem } from '../../types/dashboard';

type DrawerNav = DrawerNavigationProp<Record<string, undefined>>;

// Hex equivalents of NativeWind tokens — used only in chart library props which don't accept className
const CHART_COLORS = {
  primaryLight: '#818cf8',
  primary: '#4f46e5',
  axisLabel: 'rgba(255,255,255,0.65)',
  axisLabelMuted: 'rgba(255,255,255,0.4)',
} as const;

const STATUS_BADGE_CLASSES: Record<EquipmentStatusItem['status'], string> = {
  maintenance: 'text-amber-300',
  retired: 'text-red-300',
  overdue: 'text-red-300',
};

const STATUS_LABELS: Record<EquipmentStatusItem['status'], string> = {
  maintenance: 'Maintenance',
  retired: 'Retired',
  overdue: 'Overdue',
};

function buildSessionsDelta(thisMonth: number, lastMonth: number): { text: string; variant: 'success' | 'danger' | 'muted' } {
  if (lastMonth === 0) {
    return { text: 'sessions this month', variant: 'muted' };
  }
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  if (pct >= 0) {
    return { text: `+${pct}% vs last month`, variant: 'success' };
  }
  return { text: `↓${Math.abs(pct)}% vs last month`, variant: 'danger' };
}

function buildCheckinRateDelta(thisWeek: number, lastWeek: number): { text: string; variant: 'success' | 'danger' | 'muted' } {
  const diff = thisWeek - lastWeek;
  if (diff > 0) return { text: `↑${diff}% vs last week`, variant: 'success' };
  if (diff < 0) return { text: `↓${Math.abs(diff)}% vs last week`, variant: 'danger' };
  return { text: 'same as last week', variant: 'muted' };
}

export function OwnerDashboard() {
  const { data, isLoading, fetchDashboard } = useOwnerDashboardStore();
  const navigation = useNavigation<DrawerNav>();

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading || !data) {
    return (
      <View testID="owner-dashboard" className="flex-1">
        <DashboardSkeleton />
      </View>
    );
  }

  const { stats, memberGrowth, trainerPerformance, equipment } = data;

  const sessionsDelta = buildSessionsDelta(stats.sessionsThisMonth, stats.sessionsLastMonth);
  const checkinDelta = buildCheckinRateDelta(stats.checkinRateThisWeek, stats.checkinRateLastWeek);

  const maxSessions = trainerPerformance.length > 0
    ? Math.max(...trainerPerformance.map((t) => t.sessionCount))
    : 1;

  const barData = memberGrowth.map((entry, index) => ({
    value: entry.count,
    label: entry.month,
    frontColor: index === memberGrowth.length - 1 ? CHART_COLORS.primaryLight : CHART_COLORS.primary,
  }));

  return (
    <View testID="owner-dashboard" className="flex-1">
      <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-6 gap-6">
          {/* Page title */}
          <View>
            <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
              Dashboard
            </Text>
            <Text className="mt-0.5 text-[12px] text-foreground/65">Gym overview</Text>
          </View>

          {/* KPI 2×3 grid */}
          <View className="gap-2">
            <View className="flex-row gap-2">
              <StatCard
                testID="stat-trainers"
                label="TRAINERS"
                value={String(stats.trainerCount)}
              />
              <StatCard
                testID="stat-members"
                label="MEMBERS"
                value={String(stats.memberCount)}
                delta={`+${stats.membersJoinedThisMonth} joined this month`}
                deltaVariant="success"
              />
            </View>
            <View className="flex-row gap-2">
              <StatCard
                testID="stat-sessions-month"
                label="SESSIONS / MONTH"
                value={String(stats.sessionsThisMonth)}
                delta={sessionsDelta.text}
                deltaVariant={sessionsDelta.variant}
              />
              <StatCard
                testID="stat-active-today"
                label="ACTIVE TODAY"
                value={String(stats.activeToday)}
                delta="sessions started today"
                deltaVariant="muted"
              />
            </View>
            <View className="flex-row gap-2">
              <StatCard
                testID="stat-checkin-rate"
                label="CHECK-IN RATE"
                value={`${stats.checkinRateThisWeek}%`}
                delta={checkinDelta.text}
                deltaVariant={checkinDelta.variant}
              />
              <StatCard
                testID="stat-pending-invites"
                label="PENDING INVITES"
                value={String(stats.pendingInviteCount)}
                delta={stats.expiringInviteCount > 0 ? `${stats.expiringInviteCount} expiring soon` : undefined}
                deltaVariant="warning"
              />
            </View>
          </View>

          {/* Member Growth Chart */}
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 p-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-3">
              MEMBER GROWTH · LAST 6 MONTHS
            </Text>
            {memberGrowth.length > 0 ? (
              <BarChart
                data={barData}
                barWidth={28}
                spacing={12}
                hideRules
                hideAxesAndRules
                xAxisLabelTextStyle={{ color: CHART_COLORS.axisLabel, fontSize: 10 }}
                noOfSections={4}
                yAxisTextStyle={{ color: CHART_COLORS.axisLabelMuted, fontSize: 10 }}
                height={120}
              />
            ) : (
              <Text className="text-[13px] text-foreground/65 py-4 text-center">
                No growth data yet
              </Text>
            )}
          </View>

          {/* Trainer Performance + Equipment Status */}
          <View className="flex-row gap-2">
            {/* Trainer Performance */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-2">
                TOP TRAINERS · THIS MONTH
              </Text>
              {trainerPerformance.length === 0 ? (
                <Text className="text-[13px] text-foreground/65 py-2">No trainers yet</Text>
              ) : (
                trainerPerformance.map((trainer) => (
                  <View key={trainer.trainerId} className="mb-2">
                    <View className="flex-row items-center justify-between mb-0.5">
                      <Text className="text-[12px] text-foreground font-medium flex-1" numberOfLines={1}>
                        {trainer.name}
                      </Text>
                      <Text className="text-[12px] font-semibold text-primary-light ml-1">
                        {trainer.sessionCount}
                      </Text>
                    </View>
                    <View className="h-1 bg-muted rounded-full overflow-hidden">
                      <View
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.round((trainer.sessionCount / maxSessions) * 100)}%` }}
                      />
                    </View>
                  </View>
                ))
              )}
              <Pressable
                onPress={() => navigation.navigate('Trainers')}
                accessibilityLabel="View all trainers"
                accessibilityRole="button"
              >
                <Text className="text-[12px] text-primary mt-1">View all →</Text>
              </Pressable>
            </View>

            {/* Equipment Status */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-2">
                EQUIPMENT
              </Text>
              {/* 2×2 counter grid */}
              <View className="gap-1 mb-2">
                <View className="flex-row gap-1">
                  <View className="flex-1 items-center py-1">
                    <Text className="text-[18px] font-bold text-emerald-300">{equipment.activeCount}</Text>
                    <Text className="text-[10px] text-foreground/65">Active</Text>
                  </View>
                  <View className="flex-1 items-center py-1">
                    <Text className="text-[18px] font-bold text-amber-300">{equipment.maintenanceCount}</Text>
                    <Text className="text-[10px] text-foreground/65">Maint.</Text>
                  </View>
                </View>
                <View className="flex-row gap-1">
                  <View className="flex-1 items-center py-1">
                    <Text className="text-[18px] font-bold text-red-300">{equipment.retiredCount}</Text>
                    <Text className="text-[10px] text-foreground/65">Retired</Text>
                  </View>
                  <View className="flex-1 items-center py-1">
                    <Text className={`text-[18px] font-bold ${equipment.overdueCount > 0 ? 'text-red-300' : 'text-foreground/40'}`}>
                      {equipment.overdueCount}
                    </Text>
                    <Text className="text-[10px] text-foreground/65">Overdue</Text>
                  </View>
                </View>
              </View>
              {/* Non-active items list */}
              {equipment.nonActiveItems.slice(0, 2).map((item, index) => (
                <View key={index} className="flex-row items-center justify-between py-0.5">
                  <Text className="text-[11px] text-foreground flex-1" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className={`text-[10px] font-medium ${STATUS_BADGE_CLASSES[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

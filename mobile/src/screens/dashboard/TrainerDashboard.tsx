import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTrainerDashboardStore } from '../../stores/trainer-dashboard.store';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardSkeleton } from '../../components/dashboard/DashboardSkeleton';
import { TrainingHeatmap } from '../../components/dashboard/TrainingHeatmap';
import { fetchMemberCheckIn } from '../../lib/api/check-ins.api';
import { AppStackParamList } from '../../navigation/index';
import {
  TrainerSession,
  NeedsAttentionItem,
  ComplianceItem,
  RecentPR,
  ThisWeekEntry,
} from '../../types/dashboard';

type DashboardNav = CompositeNavigationProp<
  DrawerNavigationProp<Record<string, undefined>>,
  NativeStackNavigationProp<AppStackParamList>
>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SESSION_DOT_CLASSES: Record<TrainerSession['status'], string> = {
  completed: 'bg-emerald-500',
  active: 'bg-primary',
  upcoming: 'bg-foreground/30',
};

const SESSION_BADGE_LABEL: Record<TrainerSession['status'], string> = {
  completed: 'Done',
  active: 'Now',
  upcoming: 'Later',
};

const SESSION_BADGE_CLASSES: Record<TrainerSession['status'], string> = {
  completed: 'text-emerald-300',
  active: 'text-primary-light',
  upcoming: 'text-foreground/30',
};

function SessionRow({ session }: { session: TrainerSession }) {
  return (
    <View className="flex-row items-center gap-2 py-1.5">
      <View className={`w-2 h-2 rounded-full ${SESSION_DOT_CLASSES[session.status]}`} />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[13px] font-semibold text-foreground">{session.memberName}</Text>
          {session.planName && (
            <Text className="text-[11px] text-foreground/65" numberOfLines={1}>
              {session.planName}
            </Text>
          )}
        </View>
        <Text className="text-[10px] text-foreground/40 mt-0.5">
          {formatTimeRange(session.startTime, session.endTime)}
        </Text>
      </View>
      <Text className={`text-[11px] font-medium ${SESSION_BADGE_CLASSES[session.status]}`}>
        {SESSION_BADGE_LABEL[session.status]}
      </Text>
    </View>
  );
}

const ALERT_DOT_CLASSES: Record<NeedsAttentionItem['alertType'], string> = {
  idle: 'bg-red-500',
  no_plan: 'bg-amber-500',
  no_nutrition: 'bg-pink-500',
  body_test_overdue: 'bg-primary',
};

function AttentionRow({ item }: { item: NeedsAttentionItem }) {
  return (
    <View className="flex-row items-start gap-1.5 py-1">
      <View className={`w-1.5 h-1.5 rounded-full mt-1 ${ALERT_DOT_CLASSES[item.alertType]}`} />
      <View className="flex-1">
        <Text className="text-[12px] font-medium text-foreground">{item.memberName}</Text>
        <Text className="text-[10px] text-foreground/65 mt-0.5">{item.detail}</Text>
      </View>
    </View>
  );
}

function ComplianceBar({ percentage }: { percentage: number }) {
  const colorClass =
    percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const textClass =
    percentage >= 80 ? 'text-emerald-300' : percentage >= 50 ? 'text-amber-300' : 'text-red-300';
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <View className={`h-full rounded-full ${colorClass}`} style={{ width: `${percentage}%` }} />
      </View>
      <Text className={`text-[10px] font-semibold tabular-nums ${textClass}`}>{percentage}%</Text>
    </View>
  );
}

function ComplianceRow({ item }: { item: ComplianceItem }) {
  return (
    <View className="mb-2">
      <Text className="text-[12px] text-foreground font-medium mb-0.5" numberOfLines={1}>
        {item.memberName}
      </Text>
      <ComplianceBar percentage={item.percentage} />
    </View>
  );
}

function PRRow({ pr }: { pr: RecentPR }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <View className="flex-1">
        <Text className="text-[12px] font-medium text-foreground" numberOfLines={1}>
          {pr.memberName}
        </Text>
        <Text className="text-[10px] text-foreground/65">{pr.exercise}</Text>
      </View>
      <View className="items-end">
        <Text className="text-[12px] font-semibold text-primary-light">
          {pr.estimatedOneRM} kg
        </Text>
        <View className="bg-primary/20 rounded-full px-1.5 py-0.5 mt-0.5">
          <Text className="text-[9px] font-semibold text-primary-light">↑ PR</Text>
        </View>
      </View>
    </View>
  );
}

function WeekBar({ entry }: { entry: ThisWeekEntry }) {
  const barClass = entry.isToday ? 'bg-primary-light' : 'bg-primary/40';
  const maxHeight = 40;
  const barHeight = entry.count > 0 ? Math.max(4, Math.min(maxHeight, entry.count * 10)) : 3;
  return (
    <View className="flex-1 items-center justify-end gap-1" style={{ height: maxHeight + 16 }}>
      <View
        className={`w-full rounded-sm ${barClass}`}
        style={{ height: barHeight }}
      />
      <Text className="text-[10px] text-foreground/65">{entry.day}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function TrainerDashboard() {
  const { data, isLoading, fetchDashboard } = useTrainerDashboardStore();
  const navigation = useNavigation<DashboardNav>();

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading || !data) {
    return (
      <View testID="trainer-dashboard" className="flex-1">
        <DashboardSkeleton />
      </View>
    );
  }

  const {
    stats,
    todaysSessions,
    needsAttention,
    pendingCheckins,
    compliance,
    recentPRs,
    myTraining,
    thisWeek,
  } = data;

  const sessionsThisWeek = thisWeek.reduce((acc, d) => acc + d.count, 0);

  return (
    <View testID="trainer-dashboard" className="flex-1">
      <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-6 gap-6">
          {/* Section 1 — Page title */}
          <View>
            <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
              Dashboard
            </Text>
            <Text className="mt-0.5 text-[12px] text-foreground/65">
              Your members at a glance
            </Text>
          </View>

          {/* Section 2 — KPI 2×2 grid */}
          <View className="gap-2">
            <View className="flex-row gap-2">
              <StatCard
                testID="stat-members"
                label="MEMBERS"
                value={String(stats.memberCount)}
              />
              <StatCard
                testID="stat-sessions-today"
                label="SESSIONS TODAY"
                value={String(stats.sessionsTodayCount)}
              />
            </View>
            <View className="flex-row gap-2">
              <StatCard
                testID="stat-checkins"
                label="CHECK-INS"
                value={String(stats.checkinsLast7Days)}
                delta="last 7 days"
                deltaVariant="muted"
              />
              <StatCard
                testID="stat-needs-attention"
                label="NEEDS ATTENTION"
                value={String(stats.needsAttentionCount)}
                delta="7+ days no session"
                deltaVariant={stats.needsAttentionCount > 0 ? 'danger' : 'muted'}
              />
            </View>
          </View>

          {/* Section 3 — Today's Sessions */}
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 p-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-2">
              {"TODAY'S SESSIONS"} · {todaysSessions.length} total
            </Text>
            {todaysSessions.length === 0 ? (
              <Text className="text-[13px] text-foreground/65 py-2">
                No sessions scheduled today
              </Text>
            ) : (
              <>
                {todaysSessions.slice(0, 6).map((session) => (
                  <SessionRow key={`${session.memberId}-${session.startTime}`} session={session} />
                ))}
                {todaysSessions.length > 6 && (
                  <Pressable
                    onPress={() => navigation.navigate('Calendar')}
                    accessibilityLabel="View in calendar"
                    accessibilityRole="button"
                  >
                    <Text className="text-[12px] text-primary mt-1">View in calendar →</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>

          {/* Section 4 — Needs Attention + Pending Check-ins */}
          <View className="flex-row gap-2">
            {/* Needs Attention */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-1">
                NEEDS ATTENTION
              </Text>
              {needsAttention.length === 0 ? (
                <Text className="text-[12px] text-emerald-300 py-1">All members on track ✓</Text>
              ) : (
                needsAttention.slice(0, 3).map((item) => (
                  <AttentionRow key={item.memberId} item={item} />
                ))
              )}
              <Pressable
                onPress={() => navigation.navigate('Members')}
                accessibilityLabel="View all needs attention"
                accessibilityRole="button"
              >
                <Text className="text-[12px] text-primary mt-1">View all →</Text>
              </Pressable>
            </View>

            {/* Pending Check-ins */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-1">
                PENDING CHECK-INS
              </Text>
              {pendingCheckins.length === 0 ? (
                <Text className="text-[12px] text-emerald-300 py-1">All caught up ✓</Text>
              ) : (
                pendingCheckins.slice(0, 3).map((ci) => (
                  <View key={ci.checkinId} className="flex-row items-center justify-between py-1">
                    <View className="flex-1">
                      <Text className="text-[12px] font-medium text-foreground" numberOfLines={1}>
                        {ci.memberName}
                      </Text>
                      <Text className="text-[10px] text-foreground/65">
                        {formatRelativeTime(ci.createdAt)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        void fetchMemberCheckIn(ci.memberId, ci.checkinId).then((checkIn) => {
                          navigation.navigate('CheckInDetail', { checkIn });
                        });
                      }}
                      accessibilityLabel={`Review check-in for ${ci.memberName}`}
                      accessibilityRole="button"
                    >
                      <Text className="text-[11px] text-primary ml-1">Review →</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Section 5 — Member Compliance + Recent PRs */}
          <View className="flex-row gap-2">
            {/* Member Compliance */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-2">
                COMPLIANCE · 30D
              </Text>
              {compliance.length === 0 ? (
                <Text className="text-[12px] text-foreground/65">No data</Text>
              ) : (
                compliance.slice(0, 5).map((item) => (
                  <ComplianceRow key={item.memberId} item={item} />
                ))
              )}
            </View>

            {/* Recent PRs */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-1">
                RECENT PRs
              </Text>
              {recentPRs.length === 0 ? (
                <Text className="text-[12px] text-foreground/65 py-1">No PRs this week</Text>
              ) : (
                recentPRs.slice(0, 5).map((pr) => (
                  <PRRow key={`${pr.memberId}-${pr.exercise}`} pr={pr} />
                ))
              )}
            </View>
          </View>

          {/* Section 6 — My Training + This Week */}
          <View className="flex-row gap-2">
            {/* My Training */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-2">
                MY TRAINING
              </Text>
              <View className="flex-row items-baseline gap-1 mb-0.5">
                <Text className="text-[22px] font-bold text-foreground">
                  {myTraining.streakDays}
                </Text>
                <Text className="text-[11px] text-foreground/65">day streak 🔥</Text>
              </View>
              {myTraining.lastSessionDate && (
                <Text className="text-[10px] text-foreground/40 mb-2">
                  Last: {myTraining.lastSessionType ?? 'session'} &middot;{' '}
                  {formatRelativeTime(myTraining.lastSessionDate)}
                </Text>
              )}
              <TrainingHeatmap variant="14-day" activeDays={myTraining.last14Days} />
              <Text className="text-[10px] text-foreground/40 mt-2">
                {myTraining.sessionsThisMonth} sessions this month
              </Text>
            </View>

            {/* This Week */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-2">
                THIS WEEK
              </Text>
              <View className="flex-row gap-1 flex-1">
                {thisWeek.map((entry) => (
                  <WeekBar key={entry.day} entry={entry} />
                ))}
              </View>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-[10px] text-foreground/40">
                  {sessionsThisWeek} sessions this week
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('Calendar')}
                  accessibilityLabel="View calendar"
                  accessibilityRole="button"
                >
                  <Text className="text-[10px] text-primary">View calendar →</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

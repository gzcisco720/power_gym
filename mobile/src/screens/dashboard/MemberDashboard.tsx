import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import { useMemberDashboardStore } from '../../stores/member-dashboard.store';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardSkeleton } from '../../components/dashboard/DashboardSkeleton';
import { TrainingHeatmap, HeatmapMonthLabels } from '../../components/dashboard/TrainingHeatmap';
import {
  MemberTodaysPlan,
  NutritionToday,
  UpcomingSession,
  BodyCompositionEntry,
  StrengthProgressData,
} from '../../types/dashboard';

type DrawerNav = DrawerNavigationProp<Record<string, undefined>>;

// ─── Greeting helpers ─────────────────────────────────────────────────────────

function getTimeOfDay(hour: number): { period: string; emoji: string } {
  if (hour >= 5 && hour < 12) return { period: 'morning', emoji: '☀️' };
  if (hour >= 12 && hour < 18) return { period: 'afternoon', emoji: '🌤' };
  return { period: 'evening', emoji: '🌙' };
}

// ─── Today's Workout Card ─────────────────────────────────────────────────────

function WorkoutHeroCard({
  plan,
  onStart,
}: {
  plan: MemberTodaysPlan;
  onStart: () => void;
}) {
  const visibleExercises = plan.exercises.slice(0, 5);
  const overflow = plan.exercises.length - 5;

  return (
    <LinearGradient
      colors={['#1e1b4b', '#312e81']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 12, padding: 16 }}
    >
      <View testID="workout-hero-card">
      {/* Day type badge */}
      <View className="mb-2">
        <Text className="text-[8px] font-semibold uppercase tracking-[1.5px] text-primary-light">
          {plan.dayType}
        </Text>
      </View>

      {/* Plan name */}
      <Text className="text-[14px] font-bold text-foreground mb-2">{plan.planName}</Text>

      {/* Exercise tags */}
      <View className="flex-row flex-wrap gap-1 mb-3">
        {visibleExercises.map((ex) => (
          <View key={ex.name} className="bg-white/10 rounded-full px-2 py-0.5">
            <Text className="text-[10px] text-foreground/80">{ex.name}</Text>
          </View>
        ))}
        {overflow > 0 && (
          <View className="bg-white/10 rounded-full px-2 py-0.5">
            <Text className="text-[10px] text-foreground/60">+{overflow} more</Text>
          </View>
        )}
      </View>

      {/* Metadata + Start button */}
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] text-foreground/50">
          {plan.exerciseCount} exercises · {plan.setCount} sets · ~{plan.estimatedMinutes} min
        </Text>
        <Pressable
          onPress={onStart}
          accessibilityLabel="Start workout"
          className="bg-primary rounded-lg px-3 py-1.5"
        >
          <Text className="text-[13px] font-semibold text-foreground">Start →</Text>
        </Pressable>
      </View>
      </View>
    </LinearGradient>
  );
}

function WorkoutHeroEmpty() {
  return (
    <View
      testID="workout-hero-card"
      className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 items-center justify-center"
      style={{ minHeight: 100 }}
    >
      <Text className="text-[13px] text-foreground/65">No training plan assigned yet</Text>
    </View>
  );
}

// ─── Body Composition Chart ───────────────────────────────────────────────────

function BodyCompositionChart({ entries }: { entries: BodyCompositionEntry[] }) {
  if (entries.length === 0) {
    return (
      <Text className="text-[13px] text-foreground/65 py-4 text-center">
        No body composition data yet
      </Text>
    );
  }

  const weightData = entries.map((e) => ({
    value: e.weight,
    label: e.date.slice(5),
    dataPointColor: '#10b981',
  }));
  const bodyFatData = entries.map((e) => ({
    value: e.bodyFat,
    dataPointColor: '#ec4899',
  }));

  return (
    <View>
      <LineChart
        data={weightData}
        data2={bodyFatData}
        color1="#10b981"
        color2="#ec4899"
        dataPointsColor1="#10b981"
        dataPointsColor2="#ec4899"
        hideRules
        xAxisLabelTextStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}
        yAxisTextStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}
        height={100}
      />
      {/* Legend */}
      <View className="flex-row gap-3 mt-2">
        <View className="flex-row items-center gap-1">
          <View className="w-3 h-0.5 bg-emerald-500" />
          <Text className="text-[10px] text-foreground/65">Weight (kg)</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="w-3 h-0.5 bg-pink-500" />
          <Text className="text-[10px] text-foreground/65">Body Fat %</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Strength Progress Chart ──────────────────────────────────────────────────

function StrengthProgressChart({
  progress,
  selectedExercise,
  onSelectExercise,
}: {
  progress: StrengthProgressData;
  selectedExercise: string | null;
  onSelectExercise: (exercise: string) => Promise<void>;
}) {
  const current = selectedExercise ?? progress.exercises[0] ?? '';

  const lineData = progress.data.map((d) => ({
    value: d.estimatedOneRM,
    label: d.date.slice(5),
    dataPointColor: '#818cf8',
  }));

  return (
    <View>
      {/* Exercise selector pill */}
      <View className="flex-row items-center gap-2 mb-3">
        <Pressable
          onPress={() => {
            // Cycle through exercises for simplicity (production: open picker)
            const idx = progress.exercises.indexOf(current);
            const next = progress.exercises[(idx + 1) % progress.exercises.length];
            if (next && next !== current) {
              void onSelectExercise(next);
            }
          }}
          accessibilityLabel="Select exercise"
          className="flex-row items-center bg-muted rounded-full px-3 py-1 gap-1"
        >
          <Text className="text-[12px] font-medium text-foreground">{current}</Text>
          <Text className="text-[10px] text-foreground/65">▾</Text>
        </Pressable>
      </View>

      {progress.data.length === 0 ? (
        <Text className="text-[13px] text-foreground/65 py-4 text-center">
          No strength data yet
        </Text>
      ) : (
        <LineChart
          data={lineData}
          color="#818cf8"
          dataPointsColor="#818cf8"
          hideRules
          xAxisLabelTextStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}
          yAxisTextStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}
          height={100}
        />
      )}
    </View>
  );
}

// ─── Nutrition Today ──────────────────────────────────────────────────────────

const MACRO_ROW_CLASSES = {
  protein: { dot: 'bg-emerald-500', value: 'text-emerald-400' },
  carbs: { dot: 'bg-amber-500', value: 'text-amber-400' },
  fat: { dot: 'bg-pink-500', value: 'text-pink-400' },
  calories: { dot: 'bg-foreground/40', value: 'text-foreground' },
};

function NutritionTodayCard({ nutrition }: { nutrition: NutritionToday }) {
  return (
    <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          NUTRITION
        </Text>
        <View className="bg-primary/20 rounded-full px-2 py-0.5">
          <Text className="text-[9px] font-semibold text-primary-light">{nutrition.dayType}</Text>
        </View>
      </View>

      {/* Macro rows */}
      {(
        [
          { key: 'protein', label: 'Protein', value: nutrition.protein, unit: 'g' },
          { key: 'carbs', label: 'Carbs', value: nutrition.carbs, unit: 'g' },
          { key: 'fat', label: 'Fat', value: nutrition.fat, unit: 'g' },
        ] as const
      ).map(({ key, label, value, unit }) => (
        <View key={key} className="flex-row items-center justify-between py-0.5">
          <Text className="text-[11px] text-foreground/65">{label}</Text>
          <Text className={`text-[12px] font-bold tabular-nums ${MACRO_ROW_CLASSES[key].value}`}>
            {value}
            <Text className="text-[9px] font-normal text-foreground/40"> {unit}</Text>
          </Text>
        </View>
      ))}

      {/* Divider + Calories */}
      <View className="border-t border-foreground/10 mt-1 pt-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] text-foreground/65">Calories</Text>
          <Text className="text-[12px] font-bold tabular-nums text-foreground">
            {nutrition.calories}
            <Text className="text-[9px] font-normal text-foreground/40"> kcal</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Upcoming Sessions ────────────────────────────────────────────────────────

function UpcomingSessionRow({ session }: { session: UpcomingSession }) {
  const dt = new Date(session.datetime);
  const timeStr = dt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dayStr = dt.toLocaleDateString('en-US', { weekday: 'short' });

  let badgeText: string;
  let badgeClass: string;
  if (session.daysFromNow === 0) {
    badgeText = 'Today';
    badgeClass = 'bg-primary/20 text-primary-light';
  } else if (session.daysFromNow === 1) {
    badgeText = 'Tomorrow';
    badgeClass = 'bg-amber-500/20 text-amber-400';
  } else {
    badgeText = `${session.daysFromNow} days`;
    badgeClass = 'text-foreground/40';
  }

  return (
    <View className="flex-row items-start justify-between py-1">
      <View className="flex-1">
        <Text className="text-[12px] font-semibold text-foreground">{timeStr}</Text>
        <Text className="text-[10px] text-foreground/50">{dayStr} · {session.type}</Text>
      </View>
      <View className={`rounded-full px-2 py-0.5 ${badgeClass.split(' ')[0] ?? ''}`}>
        <Text className={`text-[9px] font-medium ${badgeClass.split(' ')[1] ?? 'text-foreground/40'}`}>
          {badgeText}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function MemberDashboard() {
  const { data, isLoading, selectedExercise, fetchDashboard, selectExercise } =
    useMemberDashboardStore();
  const navigation = useNavigation<DrawerNav>();

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading || !data) {
    return (
      <View testID="member-dashboard" className="flex-1">
        <DashboardSkeleton />
      </View>
    );
  }

  const {
    greeting,
    todaysPlan,
    stats,
    trainingHeatmap,
    bodyComposition,
    strengthProgress,
    nutritionToday,
    upcomingSessions,
  } = data;

  const hour = new Date().getHours();
  const { period, emoji } = getTimeOfDay(hour);
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const sessionsLast90 = trainingHeatmap.filter(Boolean).length;

  // KPI delta helpers
  const weightDelta =
    stats.latestWeight !== null && stats.previousWeight !== null
      ? stats.latestWeight - stats.previousWeight
      : null;
  const bodyFatDelta =
    stats.latestBodyFat !== null && stats.previousBodyFat !== null
      ? stats.latestBodyFat - stats.previousBodyFat
      : null;

  return (
    <View testID="member-dashboard" className="flex-1">
      <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-6 gap-6">

          {/* Section 1 — Greeting Hero */}
          <View>
            <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
              {`Good ${period}, ${greeting.firstName} ${emoji}`}
            </Text>
            <Text className="mt-0.5 text-[12px] text-foreground/65">{dateStr}</Text>
            {/* Streak */}
            <View className="flex-row items-baseline gap-1.5 mt-3">
              <Text className="text-[28px] font-bold text-amber-400 tabular-nums">
                {greeting.streakDays}
              </Text>
              <Text className="text-[11px] text-foreground/65">day streak 🔥</Text>
            </View>
          </View>

          {/* Section 2 — Today's Workout Card */}
          {todaysPlan ? (
            <WorkoutHeroCard
              plan={todaysPlan}
              onStart={() => navigation.navigate('MyTraining')}
            />
          ) : (
            <WorkoutHeroEmpty />
          )}

          {/* Section 3 — KPI 2×2 grid */}
          <View className="gap-2">
            <View className="flex-row gap-2">
              <StatCard
                testID="stat-sessions"
                label="SESSIONS"
                value={String(stats.sessionsThisMonth)}
                delta="this month"
                deltaVariant="muted"
              />
              <StatCard
                testID="stat-weight"
                label="WEIGHT KG"
                value={stats.latestWeight !== null ? String(stats.latestWeight) : '—'}
                delta={
                  weightDelta !== null
                    ? `${weightDelta >= 0 ? '↑' : '↓'}${Math.abs(weightDelta).toFixed(1)} vs last`
                    : undefined
                }
                deltaVariant={
                  weightDelta === null ? 'muted' : weightDelta <= 0 ? 'success' : 'danger'
                }
              />
            </View>
            <View className="flex-row gap-2">
              <StatCard
                testID="stat-body-fat"
                label="BODY FAT %"
                value={stats.latestBodyFat !== null ? `${stats.latestBodyFat}%` : '—'}
                delta={
                  bodyFatDelta !== null
                    ? `${bodyFatDelta >= 0 ? '↑' : '↓'}${Math.abs(bodyFatDelta).toFixed(1)}% vs last`
                    : undefined
                }
                deltaVariant={
                  bodyFatDelta === null ? 'muted' : bodyFatDelta <= 0 ? 'success' : 'danger'
                }
              />
              <StatCard
                testID="stat-top-pr"
                label="TOP PR"
                value={stats.topPR !== null ? `${stats.topPR.estimatedOneRM} kg` : '—'}
                delta={stats.topPR?.exercise}
                deltaVariant={stats.newPRThisMonth ? 'warning' : 'muted'}
              />
            </View>
          </View>

          {/* Section 4 — 90-day Training Heatmap */}
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 p-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-2">
              TRAINING FREQUENCY
            </Text>
            <HeatmapMonthLabels activeDays={trainingHeatmap} />
            <TrainingHeatmap variant="90-day" activeDays={trainingHeatmap} />
            <Text className="text-[9px] text-foreground/40 mt-2">
              {sessionsLast90} sessions · last 90 days
            </Text>
          </View>

          {/* Section 5 — Body Composition Chart */}
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 p-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-3">
              BODY COMPOSITION
            </Text>
            <BodyCompositionChart entries={bodyComposition} />
          </View>

          {/* Section 6 — Strength Progress Chart */}
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 p-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-2">
              STRENGTH PROGRESS
            </Text>
            <StrengthProgressChart
              progress={strengthProgress}
              selectedExercise={selectedExercise}
              onSelectExercise={selectExercise}
            />
          </View>

          {/* Section 7 — Nutrition Today + Upcoming Sessions */}
          <View className="flex-row gap-2">
            {/* Nutrition Today */}
            {nutritionToday ? (
              <NutritionTodayCard nutrition={nutritionToday} />
            ) : (
              <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-1">
                  NUTRITION
                </Text>
                <Text className="text-[12px] text-foreground/65 py-2">
                  No nutrition plan assigned
                </Text>
              </View>
            )}

            {/* Upcoming Sessions */}
            <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-1">
                UPCOMING
              </Text>
              {upcomingSessions.length === 0 ? (
                <Text className="text-[12px] text-foreground/65 py-2">No upcoming sessions</Text>
              ) : (
                upcomingSessions.slice(0, 3).map((session, idx) => (
                  <UpcomingSessionRow key={`${session.datetime}-${idx}`} session={session} />
                ))
              )}
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

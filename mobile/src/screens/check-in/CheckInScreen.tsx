import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useCheckInsStore } from '../../stores/check-ins.store';
import { CheckIn } from '../../types/check-ins';
import { AppStackParamList } from '../../navigation/index';
import { AchievementsSection } from './components/AchievementsSection';
import { WellnessBreakdownSection } from './components/WellnessBreakdownSection';
import { BodyMetricsSummarySection } from './components/BodyMetricsSummarySection';
import { ProgressPhotosSection } from './components/ProgressPhotosSection';
import { CompareCard } from './components/CompareCard';
import {
  computeCheckInStreakWeeks,
  computeConsistencyHeatmap,
  computeAchievements,
  latestWithBodyMetrics,
  latestPhotos,
} from '../../lib/check-ins/wellness';

type CheckInScreenNav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}


function calcWellnessAvg(checkIn: CheckIn): string {
  const sum =
    checkIn.sleepQuality +
    checkIn.energy +
    checkIn.recovery +
    (10 - checkIn.stress) +
    (10 - checkIn.fatigue) +
    checkIn.hunger +
    checkIn.digestion;
  return (sum / 7).toFixed(1);
}

const DIET_LABEL: Record<CheckIn['stuckToDiet'], string> = {
  yes: 'On track',
  partial: 'Partial',
  no: 'Off track',
};

const DIET_STYLE: Record<CheckIn['stuckToDiet'], string> = {
  yes: 'text-emerald-300',
  partial: 'text-amber-300',
  no: 'text-rose-300',
};

export function CheckInScreen() {
  const navigation = useNavigation<CheckInScreenNav>();
  const { items, loading, fetchCheckIns, hasCheckedInThisWeek } = useCheckInsStore();
  const submitted = hasCheckedInThisWeek();
  const latestCheckIn = items[0] ?? null;

  // Derived data for the rich sections
  const streakWeeks = computeCheckInStreakWeeks(items);
  const achievements = computeAchievements(items);
  const bodyMetricsCheckIn = latestWithBodyMetrics(items);
  const recentPhotos = latestPhotos(items, 6);
  const compareCheckIn = items[1] ?? null;
  const heatmapCells = computeConsistencyHeatmap(items, 16);

  useEffect(() => {
    void fetchCheckIns();
  }, [fetchCheckIns]);

  function handleStartCheckIn() {
    navigation.navigate('CheckInForm');
  }

  function handleHistoryRowPress(checkIn: CheckIn) {
    navigation.navigate('CheckInDetail', { checkIn });
  }

  return (
    <Screen testID="screen-CheckIn">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Check-In
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">Weekly wellness tracking</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-6">
          {/* This week status card */}
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              This Week
            </Text>
            {submitted ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2 h-2 rounded-full bg-emerald-400" />
                  <Text testID="checkin-submitted-label" className="text-xs text-foreground/45">
                    {'Submitted this week'}
                    {latestCheckIn
                      ? ` · ${new Date(latestCheckIn.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                      : ''}
                  </Text>
                </View>
                {latestCheckIn && (
                  <View className="flex-row gap-2">
                    <View className="flex-1 bg-foreground/[0.05] rounded-lg px-3 py-2 items-center">
                      <Text testID="checkin-this-week-avg" className="text-sm font-bold text-primary-light tabular-nums">
                        {calcWellnessAvg(latestCheckIn)}
                      </Text>
                      <Text className="text-[10px] text-foreground/35 mt-0.5">Wellness</Text>
                    </View>
                    {latestCheckIn.weight !== null && (
                      <View className="flex-1 bg-foreground/[0.05] rounded-lg px-3 py-2 items-center">
                        <Text testID="checkin-this-week-weight" className="text-sm font-bold text-foreground tabular-nums">
                          {latestCheckIn.weight}
                        </Text>
                        <Text className="text-[10px] text-foreground/35 mt-0.5">kg</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <Pressable
                testID="checkin-start-button"
                onPress={handleStartCheckIn}
                accessibilityLabel="Start this week's check-in"
                accessibilityRole="button"
                className="bg-primary rounded-xl py-3 items-center"
              >
                <Text className="text-sm font-semibold text-foreground">
                  {"Start This Week's Check-In"}
                </Text>
              </Pressable>
            )}

            {/* Consistency heatmap — last 16 weeks */}
            <View testID="consistency-heatmap" className="gap-1.5">
              <Text className="text-[9px] uppercase tracking-widest text-foreground/40">
                Consistency
              </Text>
              <View className="flex-row gap-[3px]">
                {heatmapCells.map((cell) => (
                  <View
                    key={cell.weekStart}
                    className={`w-[11px] h-[11px] rounded-sm ${
                      cell.hasCheckIn
                        ? 'bg-primary/70'
                        : cell.isCurrentWeek
                          ? 'bg-amber-400/35'
                          : 'bg-foreground/[0.08]'
                    }`}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Rich sections — only shown when data exists */}
          {!loading && items.length > 0 && (
            <>
              <AchievementsSection
                streakWeeks={streakWeeks}
                weightLost={achievements.weightLost}
                dietStreak={achievements.dietStreak}
                totalCheckIns={achievements.totalCheckIns}
              />

              {latestCheckIn && (
                <WellnessBreakdownSection checkIn={latestCheckIn} />
              )}

              {bodyMetricsCheckIn && (
                <BodyMetricsSummarySection checkIn={bodyMetricsCheckIn} />
              )}

              {recentPhotos.length > 0 && (
                <ProgressPhotosSection photos={recentPhotos} />
              )}

              {latestCheckIn && compareCheckIn && (
                <CompareCard current={latestCheckIn} previous={compareCheckIn} />
              )}
            </>
          )}

          {/* History section */}
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              {items.length > 0 ? `Past Check-Ins (${items.length})` : 'Past Check-Ins'}
            </Text>

            {loading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <View key={i} className="rounded-xl bg-muted px-3 py-2 h-12 opacity-60" />
                ))}
              </>
            ) : items.length === 0 ? (
              <Text className="text-[13px] text-foreground/65 text-center mt-4">
                No check-ins yet.
              </Text>
            ) : (
              items.map((checkIn) => (
                <Pressable
                  key={checkIn._id}
                  testID={`checkin-history-item-${checkIn._id}`}
                  onPress={() => handleHistoryRowPress(checkIn)}
                  accessibilityLabel={`Check-in from ${formatDate(checkIn.submittedAt)}`}
                  accessibilityRole="button"
                  className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-foreground">
                      {formatDate(checkIn.submittedAt)}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      {/* 7 wellness dots — color-coded like web */}
                      {[
                        { v: checkIn.sleepQuality, inv: false },
                        { v: checkIn.energy, inv: false },
                        { v: checkIn.recovery, inv: false },
                        { v: checkIn.stress, inv: true },
                        { v: checkIn.fatigue, inv: true },
                        { v: checkIn.hunger, inv: false },
                        { v: checkIn.digestion, inv: false },
                      ].map(({ v, inv }, i) => {
                        const eff = inv ? 11 - v : v;
                        const col = eff >= 7 ? 'bg-primary' : eff >= 5 ? 'bg-amber-400' : 'bg-rose-400';
                        return <View key={i} className={`w-[5px] h-[5px] rounded-full ${col}`} />;
                      })}
                      <Text className="text-xs text-foreground/45 tabular-nums ml-0.5">
                        {calcWellnessAvg(checkIn)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text
                      testID={`checkin-diet-badge-${checkIn._id}`}
                      className={`text-xs font-medium ${DIET_STYLE[checkIn.stuckToDiet]}`}
                    >
                      {DIET_LABEL[checkIn.stuckToDiet]}
                    </Text>
                    {checkIn.weight !== null ? (
                      <Text
                        testID={`checkin-weight-${checkIn._id}`}
                        className="text-xs text-foreground/65"
                      >
                        {`${checkIn.weight} kg`}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

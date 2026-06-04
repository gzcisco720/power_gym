import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Screen } from '../../components/Screen';
import { useJourneyStore } from '../../stores/journey.store';
import { JourneySummary } from '../../types/journey';

function isEmptySummary(summary: JourneySummary): boolean {
  const hasAnySessions = summary.recentSessions.length > 0;
  const hasAnyBodyTests = summary.bodyTests.length > 0;
  const hasAnyLoggedDay = summary.nutritionDays.some((d) => d.logged);
  return summary.workoutStreak === 0 && !hasAnySessions && !hasAnyBodyTests && !hasAnyLoggedDay;
}

export function JourneyScreen() {
  const summary = useJourneyStore((s) => s.summary);
  const loading = useJourneyStore((s) => s.loading);
  const fetchSummary = useJourneyStore((s) => s.fetchSummary);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  return (
    <Screen testID="screen-Journey">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            My Journey
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">
            Your progress at a glance
          </Text>
        </View>
      </View>

      {loading ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 py-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <View key={i} className="rounded-xl bg-muted h-16 opacity-60" />
            ))}
          </View>
        </ScrollView>
      ) : summary !== null && isEmptySummary(summary) ? (
        <View testID="journey-empty" className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] font-semibold text-foreground text-center">
            No activity yet
          </Text>
          <Text className="text-[13px] text-foreground/65 text-center mt-1">
            Complete a workout, log your nutrition, or take a body test to see your journey here.
          </Text>
        </View>
      ) : summary !== null ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 py-4 gap-6">
            {/* Streak */}
            <View>
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-2">
                Workout Streak
              </Text>
              <View
                testID="journey-streak"
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3 flex-row items-center gap-2"
              >
                <Text className="text-2xl font-semibold tabular-nums text-foreground">
                  {summary.workoutStreak}
                </Text>
                <Text className="text-sm text-foreground/65">
                  {summary.workoutStreak === 1 ? 'day' : 'days'} in a row
                </Text>
              </View>
            </View>

            {/* Recent Sessions */}
            {summary.recentSessions.length > 0 ? (
              <View>
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-2">
                  Recent Sessions
                </Text>
                <View className="gap-1.5">
                  {summary.recentSessions.map((session) => (
                    <View
                      key={session._id}
                      testID={`journey-session-${session._id}`}
                      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
                    >
                      <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                        {session.dayName}
                      </Text>
                      <Text className="text-xs text-foreground/65 ml-2">
                        {session.completedSetCount} {session.completedSetCount === 1 ? 'set' : 'sets'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Nutrition Days */}
            {summary.nutritionDays.length > 0 ? (
              <View>
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-2">
                  Nutrition (Last 7 Days)
                </Text>
                <View className="gap-1.5">
                  {summary.nutritionDays.map((day) => (
                    <View
                      key={day.date}
                      testID={`journey-nutrition-day-${day.date}`}
                      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
                    >
                      <Text className="text-sm font-medium text-foreground">{day.date}</Text>
                      <View className="flex-row items-center gap-2">
                        {day.logged ? (
                          <Text className="text-xs text-foreground/65">
                            {day.loggedKcal} kcal
                          </Text>
                        ) : null}
                        {day.targetMet ? (
                          <Text className="text-xs font-medium text-emerald-300">Met</Text>
                        ) : day.logged ? (
                          <Text className="text-xs text-foreground/40">Missed</Text>
                        ) : (
                          <Text className="text-xs text-foreground/40">—</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Body Tests */}
            {summary.bodyTests.length > 0 ? (
              <View>
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-2">
                  Body Composition Trend
                </Text>
                <View className="gap-1.5">
                  {summary.bodyTests.map((test) => (
                    <View
                      key={test._id}
                      testID={`journey-body-test-${test._id}`}
                      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
                    >
                      <Text className="text-sm font-medium text-foreground">{test.date.slice(0, 10)}</Text>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-xs text-foreground/65">{test.weight} kg</Text>
                        <Text className="text-xs text-foreground/65">{test.bodyFatPct}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

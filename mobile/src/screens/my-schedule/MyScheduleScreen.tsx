import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Screen } from '../../components/Screen';
import { useScheduledSessionsStore } from '../../stores/scheduled-sessions.store';
import { SessionCard } from './components/SessionCard';

export function MyScheduleScreen() {
  const { loading, fetchSessions, getUpcoming, getPast } = useScheduledSessionsStore();

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const upcoming = getUpcoming();
  const past = getPast();

  if (loading) {
    return (
      <Screen testID="screen-MySchedule">
        <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
          <View>
            <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
              My Schedule
            </Text>
          </View>
        </View>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 py-4 gap-2">
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                testID="schedule-skeleton-row"
                className="rounded-xl bg-muted h-16 opacity-60"
              />
            ))}
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen testID="screen-MySchedule">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            My Schedule
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">
            {upcoming.length === 1
              ? '1 upcoming session'
              : `${upcoming.length} upcoming sessions`}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-6">
          {/* Upcoming section */}
          <View testID="schedule-upcoming-section" className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Upcoming
            </Text>
            {upcoming.length === 0 ? (
              <Text
                testID="schedule-upcoming-empty"
                className="text-[13px] text-foreground/65 text-center mt-2"
              >
                No upcoming sessions
              </Text>
            ) : (
              upcoming.map((session) => (
                <SessionCard key={session._id} session={session} />
              ))
            )}
          </View>

          {/* Past section */}
          <View testID="schedule-past-section" className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Past
            </Text>
            {past.length === 0 ? (
              <Text
                testID="schedule-past-empty"
                className="text-[13px] text-foreground/65 text-center mt-2"
              >
                No past sessions
              </Text>
            ) : (
              past.map((session) => (
                <SessionCard key={session._id} session={session} />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

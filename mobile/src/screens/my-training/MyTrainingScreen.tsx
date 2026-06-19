import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Skeleton } from '~/components/ui/skeleton';
import { Button } from '~/components/ui/button';
import { useTrainingStore } from '../../stores/training.store';
import { useSelfTrainingStore } from '../../stores/self-training.store';
import { AppStackParamList } from '../../navigation/index';
import { PlanDay, SelfSessionSummary } from '../../types/training';
import { SelfWorkoutCalendar } from './SelfWorkoutCalendar';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type ViewTab = 'Plan' | 'Calendar' | 'History';

const VIEW_TABS: ViewTab[] = ['Plan', 'Calendar', 'History'];

function exerciseSummary(day: PlanDay): string {
  const count = day.exercises.length;
  return `${count} ${count === 1 ? 'exercise' : 'exercises'}`;
}

export function MyTrainingScreen() {
  const navigation = useNavigation<Nav>();
  const plan = useTrainingStore((s) => s.plan);
  const loading = useTrainingStore((s) => s.loading);
  const fetchPlan = useTrainingStore((s) => s.fetchPlan);
  const startWorkout = useTrainingStore((s) => s.startWorkout);

  const sessions = useSelfTrainingStore((s) => s.sessions);
  const fetchSessions = useSelfTrainingStore((s) => s.fetchSessions);

  // Activity strip — last 14 days heatmap + this-month stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSessions = sessions.filter((s) => new Date(s.completedAt) >= startOfMonth);
  const monthSessionCount = monthSessions.length;
  const monthSetCount = monthSessions.reduce((sum, s) => sum + s.setCount, 0);
  const rpeValues = monthSessions.map((s) => s.rpe).filter((r): r is number => r !== null);
  const monthAvgRpe = rpeValues.length > 0
    ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length
    : null;

  const last14Days: boolean[] = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (13 - i));
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    return sessions.some((s) => {
      const d = new Date(s.completedAt);
      return d >= day && d < nextDay;
    });
  });

  const [activeTab, setActiveTab] = useState<ViewTab>('Plan');

  useEffect(() => {
    void fetchPlan();
    void fetchSessions();
  }, [fetchPlan, fetchSessions]);

  const handleDayPress = useCallback(
    async (dayNumber: number) => {
      const session = await startWorkout(dayNumber);
      navigation.navigate('WorkoutSession', { session });
    },
    [startWorkout, navigation],
  );

  const handleSessionSelect = useCallback(
    (session: SelfSessionSummary) => {
      navigation.navigate('SelfSessionDetail', { sessionId: session._id });
    },
    [navigation],
  );

  return (
    <Screen testID="screen-MyTraining">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            My Training
          </Text>
          {activeTab === 'Plan' && plan ? (
            <Text className="mt-0.5 text-[12px] text-foreground/65">{plan.name}</Text>
          ) : null}
        </View>
      </View>

      {/* Activity strip — last 14 days + this-month stats */}
      {sessions.length > 0 && (
        <View
          testID="activity-strip"
          className="flex-row items-center justify-between px-4 py-2 border-b border-foreground/[.06]"
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-[10px] uppercase tracking-[1.5px] font-bold text-foreground/65">
              14d
            </Text>
            <View className="flex-row gap-[3px]">
              {last14Days.map((on, i) => (
                <View
                  key={i}
                  className={`w-3 h-3 rounded-sm ${on ? 'bg-emerald-500/65' : 'bg-foreground/[0.08]'}`}
                />
              ))}
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <Text
              testID="activity-strip-sessions"
              className="text-[11px] text-foreground/65 tabular-nums"
            >
              <Text className="text-foreground font-semibold">{monthSessionCount}</Text>
              {' sessions'}
            </Text>
            {monthSetCount > 0 && (
              <Text className="text-[11px] text-foreground/65 tabular-nums">
                <Text className="text-foreground font-semibold">{monthSetCount}</Text>
                {' sets'}
              </Text>
            )}
            {monthAvgRpe !== null && (
              <Text className="text-[11px] text-foreground/65 tabular-nums">
                <Text className="text-foreground font-semibold">{monthAvgRpe.toFixed(1)}</Text>
                {' RPE'}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Segmented view switch */}
      <View className="flex-row border-b border-foreground/[.06] px-4">
        {VIEW_TABS.map((tab) => (
          <Button
            key={tab}
            testID={`view-tab-${tab}`}
            onPress={() => setActiveTab(tab)}
            accessibilityLabel={tab}
            accessibilityRole="tab"
            variant="ghost"
            className={`mr-4 py-2.5 border-b-2 h-auto rounded-none px-0 ${activeTab === tab ? 'border-primary' : 'border-transparent'}`}
          >
            <Text
              className={`text-sm font-medium ${activeTab === tab ? 'text-foreground' : 'text-foreground/65'}`}
            >
              {tab}
            </Text>
          </Button>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'Plan' && (
        <>
          {loading ? (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="px-4 py-4 gap-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} testID="skeleton-item" className="rounded-xl h-16" />
                ))}
              </View>
            </ScrollView>
          ) : plan === null ? (
            <View testID="my-training-empty" className="flex-1 items-center justify-center px-4">
              <Text className="text-[15px] font-semibold text-foreground text-center">
                No training plan assigned
              </Text>
              <Text className="text-[13px] text-foreground/65 text-center mt-1">
                Ask your trainer to assign a training plan.
              </Text>
            </View>
          ) : (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="px-4 py-4 gap-1.5">
                {plan.days.map((day) => (
                  <Pressable
                    key={day.dayNumber}
                    testID={`workout-day-${day.dayNumber}`}
                    onPress={() => void handleDayPress(day.dayNumber)}
                    accessibilityLabel={day.name}
                    accessibilityRole="button"
                    className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                        {day.name}
                      </Text>
                      <Text className="text-xs text-foreground/65 ml-2">
                        {exerciseSummary(day)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </>
      )}

      {activeTab === 'Calendar' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <SelfWorkoutCalendar sessions={sessions} onSelect={handleSessionSelect} />
        </ScrollView>
      )}

      {activeTab === 'History' && (
        sessions.length === 0 ? (
          <View testID="history-empty" className="flex-1 items-center justify-center px-4">
            <Text className="text-[15px] font-semibold text-foreground text-center">
              No sessions yet
            </Text>
            <Text className="text-[13px] text-foreground/65 text-center mt-1">
              Completed personal training sessions will appear here.
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="px-4 py-4 gap-1.5">
              {sessions.map((session) => {
                const date = new Date(session.completedAt);
                const dateLabel = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                return (
                  <Pressable
                    key={session._id}
                    testID={`history-row-${session._id}`}
                    onPress={() => handleSessionSelect(session)}
                    accessibilityLabel={session.dayName}
                    accessibilityRole="button"
                    className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                        {session.dayName}
                      </Text>
                      <Text className="text-xs text-foreground/65 ml-2">{dateLabel}</Text>
                    </View>
                    <Text className="text-xs text-foreground/65 mt-0.5">
                      {session.setCount} {session.setCount === 1 ? 'set' : 'sets'}
                      {session.rpe !== null ? ` · RPE ${session.rpe}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )
      )}
    </Screen>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useTrainingStore } from '../../stores/training.store';
import { useSelfTrainingStore } from '../../stores/self-training.store';
import { AppStackParamList } from '../../navigation/index';
import { PlanDay, SelfSessionSummary } from '../../types/training';
import { SelfWorkoutCalendar } from './SelfWorkoutCalendar';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type ViewTab = 'Plan' | 'Calendar';

const VIEW_TABS: ViewTab[] = ['Plan', 'Calendar'];

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
    (_session: SelfSessionSummary) => {
      // Navigation to SelfSessionDetail will be wired in Stage 5.
    },
    [],
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

      {/* Segmented view switch */}
      <View className="flex-row border-b border-foreground/[.06] px-4">
        {VIEW_TABS.map((tab) => (
          <Pressable
            key={tab}
            testID={`view-tab-${tab}`}
            onPress={() => setActiveTab(tab)}
            accessibilityLabel={tab}
            accessibilityRole="tab"
            className={`mr-4 py-2.5 border-b-2 ${activeTab === tab ? 'border-primary' : 'border-transparent'}`}
          >
            <Text
              className={`text-sm font-medium ${activeTab === tab ? 'text-foreground' : 'text-foreground/65'}`}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'Plan' && (
        <>
          {loading ? (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="px-4 py-4 gap-2">
                {[0, 1, 2].map((i) => (
                  <View key={i} className="rounded-xl bg-muted h-16 opacity-60" />
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
    </Screen>
  );
}

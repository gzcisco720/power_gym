import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchMemberHistory } from '../../../lib/api/training.api';
import { useTrainingStore } from '../../../stores/training.store';
import { WorkoutSession, ActivePlan, PlanDay } from '../../../types/training';
import { AppStackParamList } from '../../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList>;

interface MemberTrainingTabProps {
  memberId: string;
  memberName: string;
  activePlan: ActivePlan | null;
  onAssignPress: () => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MemberTrainingTab({ memberId, memberName, activePlan, onAssignPress }: MemberTrainingTabProps) {
  const navigation = useNavigation<Nav>();
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [memberPlan, setMemberPlan] = useState<ActivePlan | null>(null);

  const fetchMemberPlan = useTrainingStore((s) => s.fetchMemberPlan);
  const startMemberSession = useTrainingStore((s) => s.startMemberSession);

  useEffect(() => {
    setLoading(true);
    fetchMemberHistory(memberId)
      .then((sessions) => setHistory(sessions))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [memberId]);

  useEffect(() => {
    fetchMemberPlan(memberId)
      .then((plan) => setMemberPlan(plan))
      .catch(() => setMemberPlan(null));
  }, [memberId, fetchMemberPlan]);

  async function handleLogSessionDay(day: PlanDay) {
    await startMemberSession(memberId, day.dayNumber);
    navigation.navigate('TrainerWorkoutSession', { memberId, memberName });
  }

  // Prefer activePlan prop (updated immediately after assignment) over the
  // internally-fetched memberPlan so Log Session day buttons appear without remount.
  const logPlan = activePlan ?? memberPlan;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Active plan section */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Active Plan
          </Text>

          {activePlan ? (
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">{activePlan.name}</Text>
              <Pressable
                testID="assign-plan-button"
                onPress={onAssignPress}
                accessibilityLabel="Reassign plan"
                accessibilityRole="button"
                className="rounded-lg bg-muted px-2.5 py-1"
              >
                <Text className="text-xs text-foreground/65">Reassign</Text>
              </Pressable>
            </View>
          ) : (
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between">
              <Text className="text-sm text-foreground/65">No plan assigned</Text>
              <Pressable
                testID="assign-plan-button"
                onPress={onAssignPress}
                accessibilityLabel="Assign plan"
                accessibilityRole="button"
                className="rounded-lg bg-primary px-2.5 py-1"
              >
                <Text className="text-xs font-semibold text-foreground">Assign</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Log Session section — shown when a plan with days is available */}
        {logPlan && logPlan.days.length > 0 ? (
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Log Session
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {logPlan.days.map((day) => (
                <Pressable
                  key={day.dayNumber}
                  testID={`log-session-day-${day.dayNumber}`}
                  onPress={() => void handleLogSessionDay(day)}
                  accessibilityLabel={`Log session for ${day.name}`}
                  accessibilityRole="button"
                  className="rounded-xl bg-primary px-3 py-2 min-h-11 min-w-11 items-center justify-center"
                >
                  <Text className="text-xs font-semibold text-foreground">{day.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Workout history section */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Workout History
          </Text>

          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <View key={i} className="rounded-xl bg-muted h-12 opacity-60" />
              ))}
            </>
          ) : history.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-2">
              No completed workouts yet.
            </Text>
          ) : (
            history.map((session) => (
              <View
                key={session._id}
                testID={`history-session-${session._id}`}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                    {session.dayName}
                  </Text>
                  <Text className="text-xs text-foreground/65 ml-2">
                    {session.completedAt ? formatDate(session.completedAt) : ''}
                  </Text>
                </View>
                <Text className="text-xs text-foreground/65 mt-0.5">
                  {`${session.sets.length} sets`}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

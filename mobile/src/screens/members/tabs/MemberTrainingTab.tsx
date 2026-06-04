import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { fetchMemberHistory } from '../../../lib/api/training.api';
import { WorkoutSession, ActivePlan } from '../../../types/training';

interface MemberTrainingTabProps {
  memberId: string;
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

export function MemberTrainingTab({ memberId, activePlan, onAssignPress }: MemberTrainingTabProps) {
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchMemberHistory(memberId)
      .then((sessions) => setHistory(sessions))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [memberId]);

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

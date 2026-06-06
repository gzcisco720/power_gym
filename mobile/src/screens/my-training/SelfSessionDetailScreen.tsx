import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useSelfTrainingStore } from '../../stores/self-training.store';
import { AppStackParamList } from '../../navigation/index';
import { SessionSet } from '../../types/training';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'SelfSessionDetail'>;

interface ExerciseGroup {
  exerciseId: string;
  exerciseName: string;
  sets: SessionSet[];
}

function groupSetsByExercise(sets: SessionSet[]): ExerciseGroup[] {
  const map = new Map<string, ExerciseGroup>();
  for (const set of sets) {
    const existing = map.get(set.exerciseId);
    if (existing) {
      existing.sets.push(set);
    } else {
      map.set(set.exerciseId, {
        exerciseId: set.exerciseId,
        exerciseName: set.exerciseName,
        sets: [set],
      });
    }
  }
  return Array.from(map.values());
}

export function SelfSessionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionId } = route.params;

  const selectedSession = useSelfTrainingStore((s) => s.selectedSession);
  const loading = useSelfTrainingStore((s) => s.loading);
  const fetchSession = useSelfTrainingStore((s) => s.fetchSession);

  useEffect(() => {
    void fetchSession(sessionId);
  }, [fetchSession, sessionId]);

  const exerciseGroups = useMemo(
    () => (selectedSession ? groupSetsByExercise(selectedSession.sets) : []),
    [selectedSession],
  );

  if (loading || !selectedSession) {
    return (
      <Screen testID="screen-SelfSessionDetail">
        <View className="flex-row items-center border-b border-foreground/[.06] bg-background px-4 py-4">
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            className="mr-3"
          >
            <Text className="text-primary text-base">‹ Back</Text>
          </Pressable>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Session Detail
          </Text>
        </View>
        <View className="flex-1 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <View key={i} className="rounded-xl bg-muted h-16 mx-4 mb-2 w-full opacity-60" />
          ))}
        </View>
      </Screen>
    );
  }

  const completedDate = new Date(selectedSession.completedAt);
  const dateLabel = completedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Screen testID="screen-SelfSessionDetail">
      {/* Header */}
      <View className="flex-row items-center border-b border-foreground/[.06] bg-background px-4 py-4">
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="mr-3"
        >
          <Text className="text-primary text-base">‹ Back</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground" numberOfLines={1}>
            {selectedSession.dayName}
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">{dateLabel}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-4">
          {/* Status row */}
          <View className="flex-row items-center gap-2">
            <View
              testID="session-status-completed"
              className="rounded-full bg-emerald-500/10 px-2.5 py-0.5"
            >
              <Text className="text-xs font-medium text-emerald-300">Completed</Text>
            </View>
            {selectedSession.rpe !== null && (
              <Text className="text-xs text-foreground/65">RPE {selectedSession.rpe}</Text>
            )}
          </View>

          {/* Session note */}
          {selectedSession.note !== null && (
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3 gap-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                Note
              </Text>
              <Text className="text-sm text-foreground">{selectedSession.note}</Text>
            </View>
          )}

          {/* Exercise groups */}
          {exerciseGroups.map((group) => (
            <View
              key={group.exerciseId}
              testID={`exercise-group-${group.exerciseId}`}
              className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3 gap-2"
            >
              <Text className="text-sm font-semibold text-foreground">{group.exerciseName}</Text>
              <View className="gap-1">
                {/* Column headers */}
                <View className="flex-row">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 w-10">
                    Set
                  </Text>
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 flex-1">
                    Reps
                  </Text>
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 flex-1">
                    Weight
                  </Text>
                </View>
                {group.sets.map((set) => (
                  <View
                    key={`${set.exerciseId}-${set.setNumber}`}
                    testID={`set-row-${set.exerciseId}-${set.setNumber}`}
                    className="flex-row items-center"
                  >
                    <Text className="text-sm text-foreground/65 w-10">{set.setNumber}</Text>
                    <Text className="text-sm text-foreground flex-1">
                      {set.actualReps ?? '—'}
                    </Text>
                    <Text className="text-sm text-foreground flex-1">
                      {set.isBodyweight
                        ? 'BW'
                        : set.actualWeight !== null
                          ? `${set.actualWeight} kg`
                          : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

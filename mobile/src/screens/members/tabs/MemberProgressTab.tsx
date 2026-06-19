import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useMemberProgressStore } from '../../../stores/member-progress.store';
import { Progress } from '~/components/ui/progress';
import { Skeleton } from '~/components/ui/skeleton';

interface MemberProgressTabProps {
  memberId: string;
}

function buildHeatmapGrid(): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  // 91 cells going back from today (today is the last cell)
  for (let i = 90; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

// Build 13 columns of 7 dates each (oldest first, column-major)
function buildColumns(dates: string[]): string[][] {
  const cols: string[][] = [];
  for (let col = 0; col < 13; col++) {
    cols.push(dates.slice(col * 7, col * 7 + 7));
  }
  return cols;
}

export function MemberProgressTab({ memberId }: MemberProgressTabProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const progressByMember = useMemberProgressStore((s) => s.progressByMember);
  const historyByExercise = useMemberProgressStore((s) => s.historyByExercise);
  const loadingProgress = useMemberProgressStore((s) => s.loadingProgress);
  const loadingHistory = useMemberProgressStore((s) => s.loadingHistory);
  const fetchProgress = useMemberProgressStore((s) => s.fetchProgress);
  const fetchExerciseHistory = useMemberProgressStore((s) => s.fetchExerciseHistory);

  useEffect(() => {
    void fetchProgress(memberId);
  }, [fetchProgress, memberId]);

  const progress = progressByMember[memberId];
  const heatmapSet = new Set(progress?.heatmapDates ?? []);
  const exercises = progress?.exercises ?? [];

  const historyKey = selectedExerciseId ? `${memberId}:${selectedExerciseId}` : null;
  const history = historyKey ? historyByExercise[historyKey] : null;

  function handleExercisePillPress(exerciseId: string) {
    setSelectedExerciseId(exerciseId);
    void fetchExerciseHistory(memberId, exerciseId);
  }

  const allDates = buildHeatmapGrid();
  const columns = buildColumns(allDates);

  const hasNoActivity = progress !== undefined && heatmapSet.size === 0 && exercises.length === 0;

  if (loadingProgress) {
    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </View>
      </ScrollView>
    );
  }

  if (hasNoActivity) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text
          testID="progress-empty-state"
          className="text-[13px] text-foreground/65 text-center"
        >
          No training activity yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-6">
        {/* Heatmap section */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Activity (Last 90 Days)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-[3px]">
              {columns.map((colDates, colIndex) => (
                <View key={colIndex} className="gap-[3px]">
                  {colDates.map((date) => (
                    <View
                      key={date}
                      testID={`progress-heatmap-cell-${date}`}
                      className={`w-[14px] h-[14px] rounded-sm ${
                        heatmapSet.has(date) ? 'bg-emerald-500/30' : 'bg-muted'
                      }`}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Exercises section */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Exercises
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {exercises.map((ex) => {
                const isSelected = selectedExerciseId === ex.exerciseId;
                return (
                  <Pressable
                    key={ex.exerciseId}
                    testID={`progress-exercise-pill-${ex.exerciseId}`}
                    accessibilityRole="button"
                    accessibilityLabel={ex.exerciseName}
                    onPress={() => handleExercisePillPress(ex.exerciseId)}
                    className={`rounded-full px-3 py-1.5 ${isSelected ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <Text
                      className={`text-xs font-medium ${isSelected ? 'text-foreground' : 'text-foreground/65'}`}
                    >
                      {ex.exerciseName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Progress bars for each exercise */}
          <View className="gap-2">
            {exercises.map((ex) => (
              <View key={`progress-${ex.exerciseId}`} className="gap-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-foreground/65" numberOfLines={1}>
                    {ex.exerciseName}
                  </Text>
                  {ex.completionRate !== undefined ? (
                    <Text className="text-xs text-foreground/65">{`${ex.completionRate}%`}</Text>
                  ) : null}
                </View>
                <Progress
                  testID={`progress-bar-${ex.exerciseId}`}
                  value={ex.completionRate ?? 0}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Exercise history section */}
        {selectedExerciseId ? (
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Session History
            </Text>

            {loadingHistory ? (
              <>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </>
            ) : history && history.sessions.length > 0 ? (
              history.sessions.map((session) => (
                <View
                  key={session.sessionId}
                  testID={`progress-history-session-${session.sessionId}`}
                  className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-1.5"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-foreground">{session.date}</Text>
                    <Text className="text-xs font-semibold text-primary-light">
                      {`Est. 1RM ${session.estimatedOneRepMax} kg`}
                    </Text>
                  </View>
                  <View className="gap-0.5">
                    {session.sets.map((set) => (
                      <Text key={set.setNumber} className="text-xs text-foreground/65">
                        {`${set.weight} × ${set.reps}`}
                      </Text>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-[13px] text-foreground/65 text-center mt-2">
                No sessions recorded for this exercise.
              </Text>
            )}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

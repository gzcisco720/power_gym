import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { fetchMemberExerciseHistory } from '../../../../lib/api/training.api';
import { ExerciseHistoryPoint, ExerciseRef } from '../../../../types/training';

interface StrengthProgressChartProps {
  memberId: string;
  exercises: ExerciseRef[];
}

export function StrengthProgressChart({ memberId, exercises }: StrengthProgressChartProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  if (exercises.length === 0) {
    return (
      <Text testID="strength-chart-empty" className="text-[13px] text-foreground/65 text-center mt-2">
        No exercise history available.
      </Text>
    );
  }

  async function handlePillPress(exerciseId: string) {
    setSelectedId(exerciseId);
    setLoading(true);
    try {
      const points = await fetchMemberExerciseHistory(memberId, exerciseId);
      setHistory(points);
    } finally {
      setLoading(false);
    }
  }

  const chartData = history.map((point) => ({ value: point.estimatedOneRM, label: point.date }));

  return (
    <View className="gap-3">
      {/* Exercise selector pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {exercises.map((ex) => {
            const isSelected = selectedId === ex.exerciseId;
            return (
              <Pressable
                key={ex.exerciseId}
                testID={`strength-pill-${ex.exerciseId}`}
                accessibilityRole="button"
                accessibilityLabel={ex.exerciseName}
                onPress={() => void handlePillPress(ex.exerciseId)}
                className={`rounded-full px-3 py-1.5 ${isSelected ? 'bg-primary' : 'bg-muted'}`}
              >
                <Text className={`text-xs font-medium ${isSelected ? 'text-foreground' : 'text-foreground/65'}`}>
                  {ex.exerciseName}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Chart */}
      {selectedId ? (
        loading ? (
          <View className="rounded-xl bg-muted h-32 opacity-60" />
        ) : chartData.length > 0 ? (
          <View testID="strength-line-chart">
            <LineChart
              data={chartData}
              color="#4f46e5"
              thickness={2}
              dataPointsColor="#4f46e5"
              hideDataPoints={false}
              noOfSections={4}
              yAxisTextStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}
              backgroundColor="transparent"
              rulesColor="rgba(255,255,255,0.05)"
              width={280}
              height={120}
              curved
            />
          </View>
        ) : (
          <Text className="text-[13px] text-foreground/65 text-center mt-2">
            No sessions recorded for this exercise.
          </Text>
        )
      ) : (
        <Text className="text-[13px] text-foreground/65 text-center mt-2">
          Select an exercise to view progress.
        </Text>
      )}
    </View>
  );
}

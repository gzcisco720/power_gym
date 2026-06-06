import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTrainersStore } from '../../../stores/trainers.store';

interface TrainerTrainingPlansTabProps {
  trainerId: string;
}

export function TrainerTrainingPlansTab({ trainerId }: TrainerTrainingPlansTabProps) {
  const trainerTrainingPlans = useTrainersStore((s) => s.trainerTrainingPlans);
  const trainerTrainingPlansLoading = useTrainersStore((s) => s.trainerTrainingPlansLoading);
  const fetchTrainerTrainingPlans = useTrainersStore((s) => s.fetchTrainerTrainingPlans);

  useEffect(() => {
    void fetchTrainerTrainingPlans(trainerId);
  }, [fetchTrainerTrainingPlans, trainerId]);

  if (trainerTrainingPlansLoading) {
    return (
      <View className="px-4 py-4 gap-2">
        {[0, 1, 2].map((i) => (
          <View key={i} className="rounded-xl bg-muted h-12 opacity-60" />
        ))}
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-1.5">
        {trainerTrainingPlans.length === 0 ? (
          <Text className="text-[13px] text-foreground/65 text-center mt-4">
            No training plans yet.
          </Text>
        ) : (
          trainerTrainingPlans.map((plan) => (
            <View
              key={plan.id}
              testID={`training-plan-row-${plan.id}`}
              className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
            >
              <View className="flex-1 gap-0.5">
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {plan.name}
                </Text>
              </View>
              <Text className="text-xs text-foreground/65">{plan.dayCount} days</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

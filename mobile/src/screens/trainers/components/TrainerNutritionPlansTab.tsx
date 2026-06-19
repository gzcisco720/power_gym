import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTrainersStore } from '../../../stores/trainers.store';
import { Skeleton } from '~/components/ui/skeleton';

interface TrainerNutritionPlansTabProps {
  trainerId: string;
}

export function TrainerNutritionPlansTab({ trainerId }: TrainerNutritionPlansTabProps) {
  const trainerNutritionPlans = useTrainersStore((s) => s.trainerNutritionPlans);
  const trainerNutritionPlansLoading = useTrainersStore((s) => s.trainerNutritionPlansLoading);
  const fetchTrainerNutritionPlans = useTrainersStore((s) => s.fetchTrainerNutritionPlans);

  useEffect(() => {
    void fetchTrainerNutritionPlans(trainerId);
  }, [fetchTrainerNutritionPlans, trainerId]);

  if (trainerNutritionPlansLoading) {
    return (
      <View className="px-4 py-4 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-1.5">
        {trainerNutritionPlans.length === 0 ? (
          <Text className="text-[13px] text-foreground/65 text-center mt-4">
            No nutrition plans yet.
          </Text>
        ) : (
          trainerNutritionPlans.map((plan) => (
            <View
              key={plan.id}
              testID={`nutrition-plan-row-${plan.id}`}
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

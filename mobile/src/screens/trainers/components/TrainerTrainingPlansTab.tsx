import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTrainersStore } from '../../../stores/trainers.store';
import { AppStackParamList } from '../../../navigation/index';
import { Skeleton } from '~/components/ui/skeleton';

type Nav = NativeStackNavigationProp<AppStackParamList>;

interface TrainerTrainingPlansTabProps {
  trainerId: string;
}

export function TrainerTrainingPlansTab({ trainerId }: TrainerTrainingPlansTabProps) {
  const navigation = useNavigation<Nav>();
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
          <Skeleton key={i} className="h-12 rounded-xl" />
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
            <Pressable
              key={plan.id}
              testID={`training-plan-row-${plan.id}`}
              onPress={() =>
                navigation.navigate('TrainingTemplateDetail', {
                  templateId: plan.id,
                  templateName: plan.name,
                })
              }
              accessibilityLabel={plan.name}
              accessibilityRole="button"
              className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
            >
              <View className="flex-1 gap-0.5">
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {plan.name}
                </Text>
              </View>
              <Text className="text-xs text-foreground/65">{plan.dayCount} days</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

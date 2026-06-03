import React, { useCallback, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useTrainersStore } from '../../stores/trainers.store';
import { TrainerListItem } from '../../types/trainers';
import { TrainerRow } from './components/TrainerRow';
import { AppStackParamList } from '../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

export function TrainersScreen() {
  const navigation = useNavigation<Nav>();
  const fetchTrainers = useTrainersStore((s) => s.fetchTrainers);
  const trainers = useTrainersStore((s) => s.trainers);
  const loading = useTrainersStore((s) => s.loading);

  useEffect(() => {
    void fetchTrainers();
  }, [fetchTrainers]);

  const handleRowPress = useCallback(
    (trainer: TrainerListItem) => {
      navigation.navigate('TrainerDetail', {
        trainerId: trainer.id,
        trainerName: trainer.name,
      });
    },
    [navigation],
  );

  return (
    <Screen testID="screen-Trainers">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Trainers
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">Manage your trainers</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-1.5">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <View key={i} className="rounded-xl bg-muted px-3 py-2 h-14 opacity-60" />
              ))}
            </>
          ) : trainers.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No trainers found.
            </Text>
          ) : (
            trainers.map((trainer) => (
              <TrainerRow key={trainer.id} trainer={trainer} onPress={handleRowPress} />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
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
  const removeTrainer = useTrainersStore((s) => s.removeTrainer);

  const [removeTarget, setRemoveTarget] = useState<TrainerListItem | null>(null);

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

  const handleRemoveConfirm = useCallback(async () => {
    if (!removeTarget) return;
    await removeTrainer(removeTarget.id);
    setRemoveTarget(null);
  }, [removeTarget, removeTrainer]);

  const totalCount = trainers.length;
  const avgMembers = totalCount === 0
    ? 0
    : Math.round(trainers.reduce((sum, t) => sum + t.memberCount, 0) / totalCount);

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

      {/* Stats strip */}
      {totalCount > 0 && (
        <View className="flex-row px-4 py-2 gap-4 border-b border-foreground/[.06]">
          <View className="flex-row items-center gap-1.5">
            <Text
              testID="stats-total-trainers"
              className="text-sm font-semibold text-foreground tabular-nums"
            >
              {String(totalCount)}
            </Text>
            <Text className="text-xs text-foreground/65">Trainers</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text
              testID="stats-avg-members"
              className="text-sm font-semibold text-foreground tabular-nums"
            >
              {String(avgMembers)}
            </Text>
            <Text className="text-xs text-foreground/65">Avg members</Text>
          </View>
        </View>
      )}

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
              <View key={trainer.id} className="gap-1">
                <TrainerRow trainer={trainer} onPress={handleRowPress} />
                <Pressable
                  testID={`remove-trainer-btn-${trainer.id}`}
                  onPress={() => setRemoveTarget(trainer)}
                  accessibilityLabel={`Remove ${trainer.name}`}
                  accessibilityRole="button"
                  className="rounded-lg bg-destructive/10 px-3 py-1.5 items-center"
                >
                  <Text className="text-xs font-medium text-destructive">Remove</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Remove confirmation dialog */}
      {removeTarget !== null && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setRemoveTarget(null)}
        >
          <View className="flex-1 justify-center items-center bg-background/80 px-6">
            <View className="w-full rounded-2xl bg-card ring-1 ring-foreground/10 p-5 gap-4">
              <Text className="text-[15px] font-semibold text-foreground">Remove trainer?</Text>
              <Text className="text-[13px] text-foreground/65">
                {removeTarget.memberCount === 1
                  ? '1 member will become unassigned'
                  : `${removeTarget.memberCount} members will become unassigned`}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setRemoveTarget(null)}
                  accessibilityLabel="Cancel remove trainer"
                  accessibilityRole="button"
                  className="flex-1 rounded-xl bg-muted px-3 py-2.5 items-center"
                >
                  <Text className="text-sm font-medium text-foreground/65">Cancel</Text>
                </Pressable>
                <Pressable
                  testID="confirm-remove-trainer"
                  onPress={() => void handleRemoveConfirm()}
                  accessibilityLabel="Confirm remove trainer"
                  accessibilityRole="button"
                  className="flex-1 rounded-xl bg-destructive/10 px-3 py-2.5 items-center"
                >
                  <Text className="text-sm font-medium text-destructive">Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { TrainerListItem } from '../../../types/trainers';

interface ReassignTrainerSheetProps {
  trainers: TrainerListItem[];
  onSelect: (trainerId: string) => void;
  onClose: () => void;
}

export function ReassignTrainerSheet({ trainers, onSelect, onClose }: ReassignTrainerSheetProps) {
  return (
    <View className="flex-1">
      {/* Sheet header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] px-4 py-4">
        <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
          Reassign Trainer
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Text className="text-sm text-foreground/65">Cancel</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-1.5">
          {trainers.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No trainers available.
            </Text>
          ) : (
            trainers.map((trainer) => (
              <Pressable
                key={trainer.id}
                testID={`reassign-trainer-option-${trainer.id}`}
                onPress={() => onSelect(trainer.id)}
                accessibilityLabel={`Assign to ${trainer.name}`}
                accessibilityRole="button"
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
              >
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {trainer.name}
                </Text>
                <Text className="text-xs text-foreground/65 mt-0.5" numberOfLines={1}>
                  {trainer.memberCount === 1 ? '1 member' : `${trainer.memberCount} members`}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

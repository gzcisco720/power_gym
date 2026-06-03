import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { TrainerListItem } from '../../../types/trainers';

interface TrainerRowProps {
  trainer: TrainerListItem;
  onPress: (trainer: TrainerListItem) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export function TrainerRow({ trainer, onPress }: TrainerRowProps) {
  const initials = getInitials(trainer.name);
  const memberLabel =
    trainer.memberCount === 1 ? '1 member' : `${trainer.memberCount} members`;

  return (
    <Pressable
      testID={`trainer-row-${trainer.id}`}
      onPress={() => onPress(trainer)}
      accessibilityLabel={`Trainer ${trainer.name}`}
      accessibilityRole="button"
      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center gap-3"
    >
      {/* Avatar initials */}
      <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
        <Text className="text-xs font-semibold text-primary-light">{initials}</Text>
      </View>

      {/* Name + email */}
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
          {trainer.name}
        </Text>
        <Text className="text-xs text-foreground/65" numberOfLines={1}>
          {trainer.email}
        </Text>
      </View>

      {/* Member count */}
      <Text className="text-xs text-foreground/65">{memberLabel}</Text>
    </Pressable>
  );
}

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { EquipmentItem } from '../../../types/equipment';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  retired: 'Retired',
};

const STATUS_CLASSES: Record<string, string> = {
  active: 'text-emerald-300',
  maintenance: 'text-amber-300',
  retired: 'text-foreground/35',
};

interface EquipmentCardProps {
  item: EquipmentItem;
  onPress: () => void;
}

export function EquipmentCard({ item, onPress }: EquipmentCardProps) {
  const isOverdue =
    item.nextServiceDate != null && new Date(item.nextServiceDate) < new Date();

  return (
    <Pressable
      testID={`equipment-card-${item._id}`}
      onPress={onPress}
      accessibilityLabel={item.name}
      accessibilityRole="button"
      className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
    >
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        <View className="flex-row items-center gap-2">
          {isOverdue ? (
            <Text className="text-xs font-medium text-amber-300">Overdue</Text>
          ) : null}
          <Text className={`text-xs font-medium ${STATUS_CLASSES[item.status] ?? 'text-foreground/65'}`}>
            {STATUS_LABELS[item.status] ?? item.status}
          </Text>
        </View>
      </View>
      {item.brand ? (
        <Text className="mt-0.5 text-xs text-foreground/65">{item.brand}</Text>
      ) : null}
    </Pressable>
  );
}

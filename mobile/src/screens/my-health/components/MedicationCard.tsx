import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Medication } from '../../../types/health';

const DURATION_LABELS: Record<string, string> = {
  long_term: 'Long-term',
  short_term: 'Short-term',
};

interface MedicationCardProps {
  medication: Medication;
  onEdit: () => void;
  onEnd: () => void;
  onDelete: () => void;
}

export function MedicationCard({ medication, onEdit, onEnd, onDelete }: MedicationCardProps) {
  const isActive = medication.status === 'active';

  return (
    <View
      testID={`medication-card-${medication._id}`}
      className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 gap-2"
    >
      {/* Row 1: name + badges */}
      <View className="flex-row items-center justify-between gap-2">
        <Text
          testID={`medication-card-name-${medication._id}`}
          className="flex-1 text-[13px] font-medium text-foreground"
          numberOfLines={1}
        >
          {medication.name}
        </Text>
        <View className="flex-row items-center gap-1.5">
          {isActive ? (
            <View className="bg-emerald-500/10 rounded-full px-2 py-0.5">
              <Text className="text-[10px] font-medium text-emerald-300">Active</Text>
            </View>
          ) : (
            <View className="bg-foreground/10 rounded-full px-2 py-0.5">
              <Text className="text-[10px] font-medium text-foreground/65">Ended</Text>
            </View>
          )}
          <View className="bg-primary/10 rounded-full px-2 py-0.5">
            <Text className="text-[10px] font-medium text-primary-light">
              {DURATION_LABELS[medication.duration] ?? medication.duration}
            </Text>
          </View>
        </View>
      </View>

      {/* Row 2: purpose */}
      <Text className="text-xs text-foreground/65" numberOfLines={2}>
        {medication.purpose}
      </Text>

      {/* Row 3: dates */}
      <View className="flex-row gap-3">
        <Text className="text-xs text-foreground/65">
          Start: <Text className="text-foreground">{medication.startDate.slice(0, 10)}</Text>
        </Text>
        {medication.endDate ? (
          <Text className="text-xs text-foreground/65">
            End: <Text className="text-foreground">{medication.endDate.slice(0, 10)}</Text>
          </Text>
        ) : null}
      </View>

      {/* Row 4: notes */}
      {medication.notes ? (
        <Text className="text-xs text-foreground/65" numberOfLines={2}>
          {medication.notes}
        </Text>
      ) : null}

      {/* Action row */}
      <View className="flex-row items-center gap-2 pt-1 border-t border-foreground/[.06]">
        {isActive ? (
          <>
            <Pressable
              testID={`medication-edit-btn-${medication._id}`}
              onPress={onEdit}
              accessibilityLabel="Edit medication"
              accessibilityRole="button"
              className="flex-1 items-center py-1.5"
            >
              <Text className="text-xs font-medium text-foreground/65">Edit</Text>
            </Pressable>

            <Pressable
              testID={`medication-end-btn-${medication._id}`}
              onPress={onEnd}
              accessibilityLabel="Mark medication as ended"
              accessibilityRole="button"
              className="flex-1 items-center py-1.5 border-l border-foreground/[.06]"
            >
              <Text className="text-xs font-medium text-amber-300">Mark as ended</Text>
            </Pressable>
          </>
        ) : null}

        <Pressable
          testID={`medication-delete-btn-${medication._id}`}
          onPress={onDelete}
          accessibilityLabel="Delete medication"
          accessibilityRole="button"
          className={`flex-1 items-center py-1.5 ${isActive ? 'border-l border-foreground/[.06]' : ''}`}
        >
          <Text className="text-xs font-medium text-destructive">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

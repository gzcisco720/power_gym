import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Injury } from '../../../types/health';

const INJURY_TYPE_LABELS: Record<string, string> = {
  acute: 'Acute',
  chronic: 'Chronic',
  post_surgery: 'Post-surgery',
};

interface InjuryCardProps {
  injury: Injury;
  onEdit: () => void;
  onResolve: () => void;
  onDelete: () => void;
}

export function InjuryCard({ injury, onEdit, onResolve, onDelete }: InjuryCardProps) {
  const isActive = injury.status === 'active';

  return (
    <View
      testID={`injury-card-${injury._id}`}
      className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 gap-2"
    >
      {/* Row 1: title + badges */}
      <View className="flex-row items-center justify-between gap-2">
        <Text
          testID={`injury-card-title-${injury._id}`}
          className="flex-1 text-[13px] font-medium text-foreground"
          numberOfLines={1}
        >
          {injury.title}
        </Text>
        <View className="flex-row items-center gap-1.5">
          {isActive ? (
            <View className="bg-emerald-500/10 rounded-full px-2 py-0.5">
              <Text className="text-[10px] font-medium text-emerald-300">Active</Text>
            </View>
          ) : (
            <View className="bg-foreground/10 rounded-full px-2 py-0.5">
              <Text className="text-[10px] font-medium text-foreground/65">Resolved</Text>
            </View>
          )}
          {injury.injuryType ? (
            <View className="bg-primary/10 rounded-full px-2 py-0.5">
              <Text className="text-[10px] font-medium text-primary-light">
                {INJURY_TYPE_LABELS[injury.injuryType] ?? injury.injuryType}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Row 2: body part + side */}
      {(injury.bodyPart ?? injury.bodySide) ? (
        <Text className="text-xs text-foreground/65">
          {[injury.bodyPart, injury.bodySide].filter(Boolean).join(' · ')}
        </Text>
      ) : null}

      {/* Row 3: pain scores */}
      {(injury.painAtRest != null || injury.painDuringExercise != null) ? (
        <View className="flex-row gap-3">
          {injury.painAtRest != null ? (
            <Text className="text-xs text-foreground/65">
              Rest pain: <Text className="text-foreground">{injury.painAtRest}</Text>
            </Text>
          ) : null}
          {injury.painDuringExercise != null ? (
            <Text className="text-xs text-foreground/65">
              Exercise pain: <Text className="text-foreground">{injury.painDuringExercise}</Text>
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Row 4: member notes */}
      {injury.memberNotes ? (
        <Text className="text-xs text-foreground/65" numberOfLines={2}>
          {injury.memberNotes}
        </Text>
      ) : null}

      {/* Action row */}
      <View className="flex-row items-center gap-2 pt-1 border-t border-foreground/[.06]">
        <Pressable
          testID={`injury-edit-btn-${injury._id}`}
          onPress={onEdit}
          accessibilityLabel="Edit injury"
          accessibilityRole="button"
          className="flex-1 items-center py-1.5"
        >
          <Text className="text-xs font-medium text-foreground/65">Edit</Text>
        </Pressable>

        {isActive ? (
          <Pressable
            testID={`injury-resolve-btn-${injury._id}`}
            onPress={onResolve}
            accessibilityLabel="Mark injury as resolved"
            accessibilityRole="button"
            className="flex-1 items-center py-1.5 border-l border-foreground/[.06]"
          >
            <Text className="text-xs font-medium text-emerald-300">Mark resolved</Text>
          </Pressable>
        ) : (
          <Pressable
            testID={`injury-reopen-btn-${injury._id}`}
            onPress={onResolve}
            accessibilityLabel="Reopen injury"
            accessibilityRole="button"
            className="flex-1 items-center py-1.5 border-l border-foreground/[.06]"
          >
            <Text className="text-xs font-medium text-primary-light">Reopen</Text>
          </Pressable>
        )}

        <Pressable
          testID={`injury-delete-btn-${injury._id}`}
          onPress={onDelete}
          accessibilityLabel="Delete injury"
          accessibilityRole="button"
          className="flex-1 items-center py-1.5 border-l border-foreground/[.06]"
        >
          <Text className="text-xs font-medium text-destructive">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { StaffSession } from '../../../types/scheduled-sessions';

interface AgendaSessionCardProps {
  session: StaffSession;
  onEdit: (session: StaffSession) => void;
  onDelete: (session: StaffSession) => void;
}

export function AgendaSessionCard({ session, onEdit, onDelete }: AgendaSessionCardProps) {
  const serviceLabel = session.serviceTypeName ?? session.customServiceName;

  return (
    <Pressable
      testID={`session-card-${session._id}`}
      onPress={() => onEdit(session)}
      accessibilityLabel={`Session with ${session.memberNames.join(', ')}`}
      accessibilityRole="button"
      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
          {session.memberNames.join(', ')}
        </Text>
        <Pressable
          testID={`session-delete-btn-${session._id}`}
          onPress={() => onDelete(session)}
          accessibilityLabel="Delete session"
          accessibilityRole="button"
          className="ml-2 p-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-sm text-destructive">✕</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between mt-1">
        <Text className="text-xs text-foreground/65">{session.trainerName}</Text>
        <Text className="text-xs text-foreground/65">
          {session.startTime} – {session.endTime}
        </Text>
      </View>

      {(serviceLabel != null || session.seriesId != null) && (
        <View className="flex-row items-center gap-2 mt-1">
          {serviceLabel != null ? (
            <Text className="text-xs text-primary-light">{serviceLabel}</Text>
          ) : null}
          {session.seriesId != null ? (
            <View
              testID="session-recurring-badge"
              className="rounded-full bg-primary/10 px-2 py-0.5"
            >
              <Text className="text-[10px] font-semibold text-primary-light">Recurring</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

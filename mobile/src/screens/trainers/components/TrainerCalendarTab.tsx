import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTrainersStore } from '../../../stores/trainers.store';
import { Skeleton } from '~/components/ui/skeleton';

interface TrainerCalendarTabProps {
  trainerId: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function TrainerCalendarTab({ trainerId }: TrainerCalendarTabProps) {
  const trainerSessions = useTrainersStore((s) => s.trainerSessions);
  const trainerSessionsLoading = useTrainersStore((s) => s.trainerSessionsLoading);
  const fetchTrainerSessions = useTrainersStore((s) => s.fetchTrainerSessions);

  useEffect(() => {
    void fetchTrainerSessions(trainerId);
  }, [fetchTrainerSessions, trainerId]);

  if (trainerSessionsLoading) {
    return (
      <View className="px-4 py-4 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-1.5">
        {trainerSessions.length === 0 ? (
          <Text className="text-[13px] text-foreground/65 text-center mt-4">
            No sessions scheduled.
          </Text>
        ) : (
          trainerSessions.map((session) => (
            <View
              key={session.id}
              testID={`calendar-session-row-${session.id}`}
              className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-foreground">
                  {formatDate(session.date)}
                </Text>
                <Text className="text-xs text-foreground/65">
                  {session.startTime} – {session.endTime}
                </Text>
              </View>
              {session.serviceTypeName ? (
                <Text className="text-xs text-foreground/65 mt-0.5">{session.serviceTypeName}</Text>
              ) : null}
              {session.memberNames.length > 0 ? (
                <Text className="text-xs text-foreground/65 mt-0.5" numberOfLines={1}>
                  {session.memberNames.join(', ')}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

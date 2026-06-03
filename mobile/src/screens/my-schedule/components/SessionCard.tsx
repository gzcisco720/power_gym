import React from 'react';
import { View, Text } from 'react-native';
import { ScheduledSession } from '../../../types/scheduled-sessions';

interface SessionCardProps {
  session: ScheduledSession;
}

function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <View
      testID={`session-card-${session._id}`}
      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">
          {formatSessionDate(session.date)}
        </Text>
        <Text className="text-sm text-foreground/65">
          {session.startTime} – {session.endTime}
        </Text>
      </View>
      <View className="flex-row items-center justify-between mt-1">
        <Text className="text-xs text-foreground/65">{session.trainerName}</Text>
        {session.serviceTypeName != null ? (
          <Text
            testID={`session-card-service-type-${session._id}`}
            className="text-xs text-primary-light"
          >
            {session.serviceTypeName}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

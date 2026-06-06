import React from 'react';
import { View, Text } from 'react-native';
import { JourneyTimelineItem } from '../../../types/journey';

interface Props {
  item: JourneyTimelineItem;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function NodeContent({ item }: Props) {
  switch (item.type) {
    case 'session_completed':
      return (
        <>
          <Text className="text-sm font-medium text-foreground">{item.dayName}</Text>
          <Text className="text-xs text-foreground/65">
            {item.completedSetCount} {item.completedSetCount === 1 ? 'set' : 'sets'}
          </Text>
        </>
      );
    case 'body_test':
      return (
        <>
          <Text className="text-sm font-medium text-foreground">Body Test</Text>
          <Text className="text-xs text-foreground/65">
            {item.weight} kg · {item.bodyFatPct}% fat
          </Text>
        </>
      );
    case 'check_in':
      return (
        <>
          <Text className="text-sm font-medium text-foreground">Check-In</Text>
          <Text className="text-xs text-foreground/65">
            Wellness avg {item.wellnessAvg.toFixed(1)}
          </Text>
        </>
      );
    case 'streak_milestone':
      return (
        <>
          <Text className="text-sm font-medium text-foreground">{item.days}-day streak</Text>
          <Text className="text-xs text-foreground/65">Streak milestone reached</Text>
        </>
      );
    case 'joined':
      return (
        <>
          <Text className="text-sm font-medium text-foreground">Joined Power Gym</Text>
          <Text className="text-xs text-foreground/65">Member since {formatDate(item.date)}</Text>
        </>
      );
  }
}

export function TimelineNode({ item }: Props) {
  return (
    <View
      testID={`timeline-node-${item.id}`}
      className="flex-row items-start gap-3"
    >
      {/* Dot */}
      <View className="mt-1.5 items-center">
        <View className="w-2.5 h-2.5 rounded-full bg-primary" />
      </View>

      {/* Content */}
      <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-0.5">
        <NodeContent item={item} />
        <Text className="text-[11px] text-foreground/40 mt-0.5">{formatDate(item.date)}</Text>
      </View>
    </View>
  );
}

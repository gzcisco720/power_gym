import React from 'react';
import { View, Text } from 'react-native';
import { WeeklyScheduleEntry } from '../../../types/trainers';

interface WeeklyScheduleBarProps {
  schedule: WeeklyScheduleEntry[];
}

const BAR_MAX_HEIGHT = 60;

export function WeeklyScheduleBar({ schedule }: WeeklyScheduleBarProps) {
  const maxCount = Math.max(...schedule.map((e) => e.count), 1);

  return (
    <View className="flex-row items-end justify-between gap-1" style={{ height: BAR_MAX_HEIGHT + 20 }}>
      {schedule.map((entry) => {
        const barHeight = Math.max((entry.count / maxCount) * BAR_MAX_HEIGHT, entry.count > 0 ? 4 : 2);
        return (
          <View key={entry.day} className="flex-1 items-center gap-1">
            <View
              testID={`schedule-bar-${entry.day}`}
              className="w-full rounded-sm bg-primary/60"
              style={{ height: barHeight }}
            />
            <Text className="text-[10px] text-foreground/65">{entry.day}</Text>
          </View>
        );
      })}
    </View>
  );
}

import React from 'react';
import { View, Text } from 'react-native';
import { SessionsTrendEntry } from '../../../types/trainers';

interface SessionsTrendChartProps {
  trend: SessionsTrendEntry[];
}

const BAR_MAX_HEIGHT = 60;

function formatMonthLabel(month: string): string {
  const [, mm] = month.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const index = parseInt(mm, 10) - 1;
  return months[index] ?? mm;
}

export function SessionsTrendChart({ trend }: SessionsTrendChartProps) {
  const maxCount = Math.max(...trend.map((e) => e.count), 1);

  return (
    <View className="flex-row items-end justify-between gap-1" style={{ height: BAR_MAX_HEIGHT + 20 }}>
      {trend.map((entry) => {
        const barHeight = Math.max((entry.count / maxCount) * BAR_MAX_HEIGHT, entry.count > 0 ? 4 : 2);
        return (
          <View key={entry.month} className="flex-1 items-center gap-1">
            <View
              testID={`trend-bar-${entry.month}`}
              className="w-full rounded-sm bg-primary/80"
              style={{ height: barHeight }}
            />
            <Text className="text-[10px] text-foreground/65">{formatMonthLabel(entry.month)}</Text>
          </View>
        );
      })}
    </View>
  );
}

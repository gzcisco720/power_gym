import React, { useMemo } from 'react';
import { View, Text } from 'react-native';

interface HeatmapEntry {
  date: string;
  count: number;
}

interface TrainingHeatmapProps {
  heatmap: HeatmapEntry[];
}

function intensityClass(count: number): string {
  if (count >= 3) return 'bg-primary';
  if (count === 2) return 'bg-primary/60';
  return 'bg-primary/30';
}

/**
 * Renders a 90-day training heatmap grid (newest on the right).
 * Only entries in `heatmap` have color; all other days render as muted.
 */
export function TrainingHeatmap({ heatmap }: TrainingHeatmapProps) {
  const byDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of heatmap) {
      map[entry.date] = entry.count;
    }
    return map;
  }, [heatmap]);

  // Build 90-day array ending today
  const days = useMemo(() => {
    const result: string[] = [];
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      result.push(d.toISOString().slice(0, 10));
    }
    return result;
  }, []);

  // Split into 13 columns of 7 (last column may be partial)
  const columns = useMemo(() => {
    const cols: string[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      cols.push(days.slice(i, i + 7));
    }
    return cols;
  }, [days]);

  return (
    <View>
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-2">
        90-Day Training Heatmap
      </Text>
      <View className="flex-row gap-0.5">
        {columns.map((col, colIdx) => (
          <View key={colIdx} className="flex-col gap-0.5">
            {col.map((date) => {
              const count = byDate[date] ?? 0;
              const hasActivity = count > 0;
              return (
                <View
                  key={date}
                  testID={`heatmap-cell-${date}`}
                  accessibilityValue={{ text: String(count) }}
                  className={`w-3 h-3 rounded-sm ${hasActivity ? intensityClass(count) : 'bg-muted'}`}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

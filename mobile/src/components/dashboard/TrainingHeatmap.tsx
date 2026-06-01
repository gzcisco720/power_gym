import React from 'react';
import { View, Text } from 'react-native';

interface TrainingHeatmapProps {
  variant: '90-day' | '14-day';
  /**
   * Array of booleans: true = session logged that day.
   * 90-day: 90 entries, index 0 = 90 days ago, index 89 = today.
   * 14-day: 14 entries, index 0 = 14 days ago, index 13 = today.
   */
  activeDays: boolean[];
}

export function TrainingHeatmap({ variant, activeDays }: TrainingHeatmapProps) {
  if (variant === '14-day') {
    return <FourteenDayHeatmap activeDays={activeDays} />;
  }
  return <NinetyDayHeatmap activeDays={activeDays} />;
}

// 14-day: 2 rows × 7 columns
function FourteenDayHeatmap({ activeDays }: { activeDays: boolean[] }) {
  const todayIndex = activeDays.length - 1;
  // Row 0: indices 0-6, Row 1: indices 7-13
  const rows: number[][] = [
    [0, 1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12, 13],
  ];

  return (
    <View className="gap-1">
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} className="flex-row gap-1">
          {row.map((cellIdx) => {
            const isActive = activeDays[cellIdx] ?? false;
            const isToday = cellIdx === todayIndex;
            return (
              <HeatmapCell
                key={cellIdx}
                isActive={isActive}
                isToday={isToday}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

// 90-day: 13 columns × 7 rows (full width grid)
function NinetyDayHeatmap({ activeDays }: { activeDays: boolean[] }) {
  const todayIndex = activeDays.length - 1;
  // 13 weeks × 7 days = 91; we use 90 days so the first cell is padded
  // Column j, row i → day index = j * 7 + i - 1 (offset by 1 for padding)
  const COLS = 13;
  const ROWS = 7;

  return (
    <View>
      <View className="flex-row gap-0.5">
        {Array.from({ length: COLS }).map((_, col) => (
          <View key={col} className="flex-1 gap-0.5">
            {Array.from({ length: ROWS }).map((__, row) => {
              // Map grid position to activeDays index
              // Last 90 days: start from grid position (col=0, row=0) = index 0 (oldest)
              // But 13×7=91 cells; we skip cell at (col=0, row=0) to get exactly 90
              const cellNum = col * ROWS + row;
              // Shift by 1 so we start from index 0 in activeDays
              const dayIndex = cellNum - 1;

              if (dayIndex < 0) {
                // Padding cell at position 0 — render invisible
                return <View key={row} style={{ opacity: 0 }} testID="heatmap-padding" className="h-3 w-full rounded-sm" />;
              }

              const isActive = activeDays[dayIndex] ?? false;
              const isToday = dayIndex === todayIndex;

              return (
                <HeatmapCell
                  key={row}
                  isActive={isActive}
                  isToday={isToday}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

interface HeatmapCellProps {
  isActive: boolean;
  isToday: boolean;
}

function HeatmapCell({ isActive, isToday }: HeatmapCellProps) {
  return (
    <View
      testID="heatmap-cell"
      data-today={isToday ? 'true' : undefined}
      data-active={isActive ? 'true' : undefined}
      className={[
        'h-3 w-full rounded-sm',
        isActive ? 'bg-emerald-500/80' : 'bg-muted',
        isToday ? 'border border-emerald-500' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

interface MonthLabelRowProps {
  activeDays: boolean[];
}

// Exposed for potential reuse in dashboards
export function HeatmapMonthLabels({ activeDays }: MonthLabelRowProps) {
  const today = new Date();
  const COLS = 13;
  const ROWS = 7;
  const labels: string[] = [];

  for (let col = 0; col < COLS; col++) {
    const cellNum = col * ROWS;
    const dayIndex = cellNum - 1;
    if (dayIndex < 0) {
      labels.push('');
      continue;
    }
    const daysAgo = activeDays.length - 1 - dayIndex;
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    // Show abbreviated month name only when transitioning months (col 0 always shows)
    const prevDayIndex = (col - 1) * ROWS - 1;
    if (col === 0 || dayIndex === 0) {
      labels.push(d.toLocaleString('en-US', { month: 'short' }));
    } else {
      const prevDaysAgo = activeDays.length - 1 - prevDayIndex;
      const prev = new Date(today);
      prev.setDate(prev.getDate() - prevDaysAgo);
      if (d.getMonth() !== prev.getMonth()) {
        labels.push(d.toLocaleString('en-US', { month: 'short' }));
      } else {
        labels.push('');
      }
    }
  }

  return (
    <View className="flex-row gap-0.5 mb-0.5">
      {labels.map((label, i) => (
        <View key={i} className="flex-1">
          <Text className="text-[8px] text-foreground/40">{label}</Text>
        </View>
      ))}
    </View>
  );
}

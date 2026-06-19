import React from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { SessionsTrendEntry } from '../../../types/trainers';

interface SessionsTrendChartProps {
  trend: SessionsTrendEntry[];
}

const CHART_COLORS = {
  primary: '#4f46e5',
  primaryLight: '#818cf8',
  axisLabel: 'rgba(255,255,255,0.65)',
} as const;

function formatMonthLabel(month: string): string {
  const [, mm] = month.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const index = parseInt(mm, 10) - 1;
  return months[index] ?? mm;
}

export function SessionsTrendChart({ trend }: SessionsTrendChartProps) {
  const barData = trend.map((entry, index) => ({
    value: entry.count,
    label: formatMonthLabel(entry.month),
    frontColor: index === trend.length - 1 ? CHART_COLORS.primaryLight : CHART_COLORS.primary,
  }));

  return (
    <View testID="sessions-trend-chart">
      <BarChart
        data={barData}
        barWidth={22}
        spacing={8}
        hideRules
        hideAxesAndRules
        xAxisLabelTextStyle={{ color: CHART_COLORS.axisLabel, fontSize: 10 }}
        height={80}
      />
    </View>
  );
}

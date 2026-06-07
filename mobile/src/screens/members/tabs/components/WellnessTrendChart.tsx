import React from 'react';
import { View, Text } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { CheckIn } from '../../../../types/check-ins';

interface WellnessTrendChartProps {
  checkIns: CheckIn[];
}

/** Compute the average of the 7 wellness sliders for a single check-in. */
function wellnessAverage(checkIn: CheckIn): number {
  const sum =
    checkIn.sleepQuality +
    checkIn.stress +
    checkIn.fatigue +
    checkIn.hunger +
    checkIn.recovery +
    checkIn.energy +
    checkIn.digestion;
  return Math.round((sum / 7) * 10) / 10;
}

export function WellnessTrendChart({ checkIns }: WellnessTrendChartProps) {
  // Use at most the last 12 entries; reverse so oldest is leftmost (chronological)
  const sliced = checkIns.slice(0, 12).reverse();

  const chartData = sliced.map((ci) => ({
    value: wellnessAverage(ci),
    label: ci.submittedAt.slice(5, 10), // MM-DD
  }));

  return (
    <View testID="wellness-trend-chart" className="gap-2">
      <Text
        testID="wellness-data-count"
        className="text-xs text-foreground/65"
      >
        {`${sliced.length} entries`}
      </Text>
      <LineChart
        data={chartData}
        color="#4f46e5"
        thickness={2}
        dataPointsColor="#4f46e5"
        hideDataPoints={false}
        noOfSections={4}
        maxValue={10}
        yAxisTextStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}
        xAxisLabelTextStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}
        backgroundColor="transparent"
        rulesColor="rgba(255,255,255,0.05)"
        width={280}
        height={100}
        curved
      />
    </View>
  );
}

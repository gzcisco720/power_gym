import React from 'react';
import { View } from 'react-native';
import { CheckIn, StuckToDiet } from '../../../../types/check-ins';

interface DietComplianceHeatmapProps {
  checkIns: CheckIn[];
}

const COLOR_MAP: Record<StuckToDiet, string> = {
  yes: 'bg-emerald-500/70',
  partial: 'bg-amber-500/70',
  no: 'bg-rose-500/70',
};

export function DietComplianceHeatmap({ checkIns }: DietComplianceHeatmapProps) {
  // Show at most 16 squares; most-recent first (checkIns[0] is latest)
  const sliced = checkIns.slice(0, 16);

  return (
    <View testID="diet-compliance-heatmap" className="flex-row flex-wrap gap-1.5">
      {sliced.map((ci) => (
        <View
          key={ci._id}
          testID={`heatmap-square-${ci._id}`}
          className={`w-6 h-6 rounded-sm ${COLOR_MAP[ci.stuckToDiet]}`}
        />
      ))}
    </View>
  );
}

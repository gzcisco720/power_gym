import React from 'react';
import { View } from 'react-native';
import { DashboardSkeleton } from '../../components/dashboard/DashboardSkeleton';

export function TrainerDashboard() {
  return (
    <View testID="trainer-dashboard" className="flex-1">
      <DashboardSkeleton />
    </View>
  );
}

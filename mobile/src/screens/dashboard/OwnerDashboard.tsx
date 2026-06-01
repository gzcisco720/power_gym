import React from 'react';
import { View } from 'react-native';
import { DashboardSkeleton } from '../../components/dashboard/DashboardSkeleton';

export function OwnerDashboard() {
  return (
    <View testID="owner-dashboard" className="flex-1">
      <DashboardSkeleton />
    </View>
  );
}

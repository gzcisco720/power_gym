import React from 'react';
import { View } from 'react-native';
import { DashboardSkeleton } from '../../components/dashboard/DashboardSkeleton';

export function MemberDashboard() {
  return (
    <View testID="member-dashboard" className="flex-1">
      <DashboardSkeleton />
    </View>
  );
}

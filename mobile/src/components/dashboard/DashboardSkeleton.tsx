import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from '~/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <ScrollView testID="dashboard-skeleton" className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-6 gap-4">
        {/* Title skeleton */}
        <View className="gap-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </View>

        {/* 2×3 stat card grid skeleton */}
        <View className="gap-2">
          {[0, 1, 2].map((row) => (
            <View key={row} className="flex-row gap-2">
              <Skeleton className="flex-1 h-16" />
              <Skeleton className="flex-1 h-16" />
            </View>
          ))}
        </View>

        {/* Chart skeleton */}
        <Skeleton className="h-36 w-full" />

        {/* Two-column section skeleton */}
        <View className="flex-row gap-2">
          <Skeleton className="flex-1 h-32" />
          <Skeleton className="flex-1 h-32" />
        </View>
      </View>
    </ScrollView>
  );
}

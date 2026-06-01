import React from 'react';
import { View, ScrollView } from 'react-native';

function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-muted rounded-lg animate-pulse ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-6 gap-4">
        {/* Title skeleton */}
        <View className="gap-1.5">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3.5 w-56" />
        </View>

        {/* 2×3 stat card grid skeleton */}
        <View className="gap-2">
          {[0, 1, 2].map((row) => (
            <View key={row} className="flex-row gap-2">
              <SkeletonBlock className="flex-1 h-16" />
              <SkeletonBlock className="flex-1 h-16" />
            </View>
          ))}
        </View>

        {/* Chart skeleton */}
        <SkeletonBlock className="h-36 w-full" />

        {/* Two-column section skeleton */}
        <View className="flex-row gap-2">
          <SkeletonBlock className="flex-1 h-32" />
          <SkeletonBlock className="flex-1 h-32" />
        </View>
      </View>
    </ScrollView>
  );
}

import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { timings } from '../../lib/animations';

function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-muted rounded-lg ${className}`} />;
}

export function DashboardSkeleton() {
  const shouldReduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (shouldReduceMotion) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, timings.skeleton),
        withTiming(1, timings.skeleton),
      ),
      -1,
      false,
    );
  }, [opacity, shouldReduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <ScrollView testID="dashboard-skeleton" className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      <Animated.View style={animatedStyle}>
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
      </Animated.View>
    </ScrollView>
  );
}

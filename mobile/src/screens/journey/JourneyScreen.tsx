import React, { useCallback, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Skeleton } from '~/components/ui/skeleton';
import { Screen } from '../../components/Screen';
import { useJourneyStore } from '../../stores/journey.store';
import { JourneyTimelineItem } from '../../types/journey';
import { JourneySummaryHeader } from './components/JourneySummaryHeader';
import { TimelineNode } from './components/TimelineNode';

function findMemberSince(items: JourneyTimelineItem[]): string | null {
  const joined = items.find((i) => i.type === 'joined');
  return joined ? joined.date : null;
}

export function JourneyScreen() {
  const summary = useJourneyStore((s) => s.summary);
  const loading = useJourneyStore((s) => s.loading);
  const items = useJourneyStore((s) => s.items);
  const nextCursor = useJourneyStore((s) => s.nextCursor);
  const loadingMore = useJourneyStore((s) => s.loadingMore);
  const fetchSummary = useJourneyStore((s) => s.fetchSummary);
  const fetchTimeline = useJourneyStore((s) => s.fetchTimeline);
  const fetchMore = useJourneyStore((s) => s.fetchMore);

  useEffect(() => {
    void fetchSummary();
    void fetchTimeline();
  }, [fetchSummary, fetchTimeline]);

  const handleEndReached = useCallback(() => {
    if (nextCursor && !loadingMore) {
      void fetchMore();
    }
  }, [nextCursor, loadingMore, fetchMore]);

  const memberSince = findMemberSince(items);
  const totalBodyTests = summary ? summary.bodyTests.length : 0;
  const totalSessions = summary ? summary.recentSessions.length : 0;
  const currentStreak = summary ? summary.workoutStreak : 0;

  const isEmpty = !loading && items.length === 0 && summary !== null;

  return (
    <Screen testID="screen-Journey">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            My Journey
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">
            Your progress at a glance
          </Text>
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View className="px-4 py-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} testID="journey-skeleton-row" className="rounded-xl h-16" />
          ))}
        </View>
      ) : isEmpty ? (
        <View testID="journey-empty" className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] font-semibold text-foreground text-center">
            No activity yet
          </Text>
          <Text className="text-[13px] text-foreground/65 text-center mt-1">
            Complete a workout, log your nutrition, or take a body test to see your journey here.
          </Text>
        </View>
      ) : (
        <FlatList
          testID="journey-timeline-list"
          data={items}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={
            memberSince ? (
              <View className="mb-2">
                <JourneySummaryHeader
                  totalSessions={totalSessions}
                  currentStreak={currentStreak}
                  totalBodyTests={totalBodyTests}
                  memberSince={memberSince}
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => <TimelineNode item={item} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <Skeleton className="h-16 rounded-xl" />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

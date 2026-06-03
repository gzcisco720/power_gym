import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MemberOverview } from '../../../types/members';

interface MemberOverviewTabProps {
  overview: MemberOverview;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MemberOverviewTab({ overview }: MemberOverviewTabProps) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Stats */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Member Stats
          </Text>

          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between">
            <Text className="text-xs text-foreground/65">Joined</Text>
            <Text testID="overview-joined-at" className="text-sm font-medium text-foreground">
              {formatDate(overview.joinedAt)}
            </Text>
          </View>

          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between">
            <Text className="text-xs text-foreground/65">Last Body Test</Text>
            <Text testID="overview-last-body-test" className="text-sm font-medium text-foreground">
              {formatDate(overview.lastBodyTestDate)}
            </Text>
          </View>

          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between">
            <Text className="text-xs text-foreground/65">Last Check-In</Text>
            <Text testID="overview-last-checkin" className="text-sm font-medium text-foreground">
              {formatDate(overview.lastCheckinDate)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

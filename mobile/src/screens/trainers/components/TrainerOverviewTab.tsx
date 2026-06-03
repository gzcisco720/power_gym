import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { TrainerDetail } from '../../../types/trainers';

interface TrainerOverviewTabProps {
  detail: TrainerDetail;
}

function formatJoinDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function TrainerOverviewTab({ detail }: TrainerOverviewTabProps) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Member count stat */}
        <View className="rounded-xl ring-1 backdrop-blur-sm p-4 bg-primary/10 ring-primary/20">
          <Text className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
            Members
          </Text>
          <View className="mt-2 flex-row items-end gap-1">
            <Text className="text-2xl font-semibold leading-none tracking-tight text-foreground">
              {detail.memberCount}
            </Text>
            <Text className="text-sm font-medium text-foreground/65 mb-0.5">assigned</Text>
          </View>
        </View>

        {/* Join date stat */}
        <View className="rounded-xl ring-1 p-4 bg-card ring-foreground/10">
          <Text className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
            Joined
          </Text>
          <Text className="mt-2 text-2xl font-semibold leading-none tracking-tight text-foreground">
            {formatJoinDate(detail.joinDate)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

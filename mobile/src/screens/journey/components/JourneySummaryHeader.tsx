import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  totalSessions: number;
  currentStreak: number;
  totalBodyTests: number;
  memberSince: string; // ISO string
}

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function StatCell({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text className="text-2xl font-semibold tabular-nums text-foreground">{value}</Text>
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 text-center">
        {label}
      </Text>
    </View>
  );
}

export function JourneySummaryHeader({
  totalSessions,
  currentStreak,
  totalBodyTests,
  memberSince,
}: Props) {
  return (
    <View
      testID="journey-summary-header"
      className="rounded-xl bg-primary/10 ring-1 ring-primary/20 px-4 py-3"
    >
      <View className="flex-row items-center justify-between">
        <StatCell label="Sessions" value={totalSessions} />
        <View className="w-px h-8 bg-foreground/10" />
        <StatCell label="Streak" value={currentStreak} />
        <View className="w-px h-8 bg-foreground/10" />
        <StatCell label="Body Tests" value={totalBodyTests} />
        <View className="w-px h-8 bg-foreground/10" />
        <StatCell label="Since" value={formatMemberSince(memberSince)} />
      </View>
    </View>
  );
}

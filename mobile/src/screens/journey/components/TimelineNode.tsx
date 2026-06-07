import React from 'react';
import { View, Text } from 'react-native';
import { JourneyTimelineItem, MilestoneTagColor, TimelineBodyTest } from '../../../types/journey';

interface Props {
  item: JourneyTimelineItem;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const TAG_BG: Record<MilestoneTagColor, string> = {
  gold: 'bg-amber-500/20',
  green: 'bg-emerald-500/20',
  indigo: 'bg-primary/20',
};
const TAG_TEXT: Record<MilestoneTagColor, string> = {
  gold: 'text-amber-300',
  green: 'text-emerald-300',
  indigo: 'text-primary-light',
};

function DeltaText({ value, suffix }: { value: number | null; suffix: string }) {
  if (value === null) return null;
  const abs = Math.abs(value).toFixed(1);
  const sign = value > 0 ? '+' : '−';
  const className = value < 0 ? 'text-emerald-300' : value > 0 ? 'text-rose-300' : 'text-foreground/65';
  return (
    <Text className={`text-[10px] mt-0.5 tabular-nums ${className}`}>
      {sign}{abs}{suffix}
    </Text>
  );
}

function BodyTestCard({ item }: { item: TimelineBodyTest }) {
  const hasMilestone = item.milestone !== null;

  if (hasMilestone) {
    const ms = item.milestone!;
    return (
      <View
        testID={`timeline-node-${item.id}`}
        className="flex-row items-start gap-3"
      >
        {/* Glowing primary dot */}
        <View className="mt-1.5 items-center">
          <View className="w-3.5 h-3.5 rounded-full bg-primary" style={{ shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />
        </View>

        {/* Milestone card */}
        <View className="flex-1 rounded-xl border border-primary/40 bg-primary/[0.08] px-3.5 py-3 gap-2 mb-1">
          {/* Header */}
          <View className="flex-row items-start gap-2">
            <Text className="text-base">{ms.emoji}</Text>
            <View className="flex-1">
              <Text className="text-[10px] text-primary-light/70">{formatMonthYear(item.date)}</Text>
              <Text className="text-sm font-bold text-foreground">{ms.title}</Text>
            </View>
          </View>

          {/* Tags */}
          {ms.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1">
              {ms.tags.map((tag) => (
                <View
                  key={tag.label}
                  className={`rounded-full px-1.5 py-0.5 ${TAG_BG[tag.color]}`}
                >
                  <Text className={`text-[9px] font-bold ${TAG_TEXT[tag.color]}`}>{tag.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats row */}
          <View className="flex-row gap-0">
            <View className="flex-1">
              <Text className="text-[9px] uppercase tracking-wider text-primary-light/50 mb-0.5">Body Fat</Text>
              <Text className="text-sm font-bold text-foreground">{item.bodyFatPct}%</Text>
              <DeltaText value={item.deltaBodyFatPct} suffix="%" />
            </View>
            <View className="flex-1 border-l border-primary/15 pl-2.5">
              <Text className="text-[9px] uppercase tracking-wider text-primary-light/50 mb-0.5">Weight</Text>
              <Text className="text-sm font-bold text-foreground">{item.weight} kg</Text>
              <DeltaText value={item.deltaWeight} suffix=" kg" />
            </View>
            <View className="flex-1 border-l border-primary/15 pl-2.5">
              <Text className="text-[9px] uppercase tracking-wider text-primary-light/50 mb-0.5">Lean Mass</Text>
              <Text className="text-sm font-bold text-foreground">{item.leanMassKg.toFixed(1)} kg</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Regular body test node
  return (
    <View
      testID={`timeline-node-${item.id}`}
      className="flex-row items-start gap-3"
    >
      <View className="mt-1.5 items-center">
        <View className="w-2.5 h-2.5 rounded-full bg-primary" />
      </View>
      <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-0.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-foreground">
            Body Test #{item.testNumber}
          </Text>
          <Text className="text-[11px] text-foreground/40">{formatDate(item.date)}</Text>
        </View>
        <View className="flex-row gap-3 mt-0.5">
          <Text className="text-xs text-foreground/65">{item.bodyFatPct}% fat</Text>
          <Text className="text-xs text-foreground/65">{item.weight} kg</Text>
          <Text className="text-xs text-foreground/65">{item.leanMassKg.toFixed(1)} kg lean</Text>
        </View>
        {(item.deltaBodyFatPct !== null || item.deltaWeight !== null) && (
          <View className="flex-row gap-3 mt-0.5">
            {item.deltaBodyFatPct !== null && (
              <DeltaText value={item.deltaBodyFatPct} suffix="% BF" />
            )}
            {item.deltaWeight !== null && (
              <DeltaText value={item.deltaWeight} suffix=" kg" />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function NodeContent({ item }: Props) {
  switch (item.type) {
    case 'body_test':
      return <BodyTestCard item={item} />;
    case 'session_completed':
      return (
        <View
          testID={`timeline-node-${item.id}`}
          className="flex-row items-start gap-3"
        >
          <View className="mt-1.5 items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-primary" />
          </View>
          <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-0.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">{item.dayName}</Text>
              <Text className="text-[11px] text-foreground/40">{formatDate(item.date)}</Text>
            </View>
            <Text className="text-xs text-foreground/65">
              {item.completedSetCount} {item.completedSetCount === 1 ? 'set' : 'sets'}
            </Text>
          </View>
        </View>
      );
    case 'check_in':
      return (
        <View
          testID={`timeline-node-${item.id}`}
          className="flex-row items-start gap-3"
        >
          <View className="mt-1.5 items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-primary" />
          </View>
          <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-0.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">Check-In</Text>
              <Text className="text-[11px] text-foreground/40">{formatDate(item.date)}</Text>
            </View>
            <Text className="text-xs text-foreground/65">
              Wellness avg {item.wellnessAvg.toFixed(1)}
            </Text>
          </View>
        </View>
      );
    case 'streak_milestone':
      return (
        <View
          testID={`timeline-node-${item.id}`}
          className="flex-row items-start gap-3"
        >
          <View className="mt-1.5 items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </View>
          <View className="flex-1 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 px-3 py-2 gap-0.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">{item.days}-day streak 🔥</Text>
              <Text className="text-[11px] text-foreground/40">{formatDate(item.date)}</Text>
            </View>
            <Text className="text-xs text-foreground/65">Streak milestone reached</Text>
          </View>
        </View>
      );
    case 'joined':
      return (
        <View
          testID={`timeline-node-${item.id}`}
          className="flex-row items-start gap-3"
        >
          <View className="mt-1.5 items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </View>
          <View className="flex-1 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 px-3 py-2 gap-0.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">Joined Power Gym 🎉</Text>
              <Text className="text-[11px] text-foreground/40">{formatDate(item.date)}</Text>
            </View>
            <Text className="text-xs text-foreground/65">Member since {formatDate(item.date)}</Text>
          </View>
        </View>
      );
  }
}

export function TimelineNode({ item }: Props) {
  return <NodeContent item={item} />;
}

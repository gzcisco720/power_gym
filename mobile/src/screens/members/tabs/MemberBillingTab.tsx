import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useBillingStore } from '../../../stores/billing.store';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';

interface MemberBillingTabProps {
  memberId: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MemberBillingTab({ memberId }: MemberBillingTabProps) {
  const period = useBillingStore((s) => s.period);
  const memberData = useBillingStore((s) => s.memberData);
  const memberLoading = useBillingStore((s) => s.memberLoading);
  const setPeriod = useBillingStore((s) => s.setPeriod);
  const fetchMember = useBillingStore((s) => s.fetchMember);

  useEffect(() => {
    void fetchMember(memberId, period.from.toISOString(), period.to.toISOString());
  }, [fetchMember, memberId, period]);

  if (memberLoading || memberData === null) {
    return (
      <View className="px-4 py-4 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Period navigation */}
        <View className="flex-row items-center justify-between">
          <Button
            testID="billing-period-prev"
            onPress={() => setPeriod('prev')}
            accessibilityLabel="Previous month"
            variant="ghost"
            size="sm"
            className="rounded-lg"
          >
            <Text className="text-xs font-medium text-foreground/65">{'‹'}</Text>
          </Button>

          <Text
            testID="billing-period-label"
            className="text-sm font-semibold text-foreground"
          >
            {period.label}
          </Text>

          <Button
            testID="billing-period-next"
            onPress={() => setPeriod('next')}
            accessibilityLabel="Next month"
            variant="ghost"
            size="sm"
            className="rounded-lg"
          >
            <Text className="text-xs font-medium text-foreground/65">{'›'}</Text>
          </Button>
        </View>

        {/* Summary cards */}
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-xl bg-primary/10 ring-1 ring-primary/20 px-3 py-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Total
            </Text>
            <Text
              testID="billing-period-total"
              className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground"
            >
              {`${memberData.currency} ${memberData.total.toFixed(2)}`}
            </Text>
          </View>

          <View className="flex-1 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Sessions
            </Text>
            <Text
              testID="billing-session-count"
              className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground"
            >
              {memberData.count}
            </Text>
          </View>
        </View>

        {/* Billing lines */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Sessions
          </Text>

          {memberData.lines.length === 0 ? (
            <View className="items-center py-8">
              <Text
                testID="billing-empty-state"
                className="text-[13px] text-foreground/65 text-center"
              >
                No billable sessions in this period.
              </Text>
            </View>
          ) : (
            memberData.lines.map((line) => (
              <View
                key={line.sessionId}
                testID={`billing-line-${line.sessionId}`}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-foreground">
                    {line.serviceTypeName}
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {`${line.currency} ${line.price.toFixed(2)}`}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text className="text-xs text-foreground/65">
                    {formatDate(line.date)}
                  </Text>
                  <Text className="text-xs text-foreground/65">
                    {`${line.startTime} – ${line.endTime}`}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

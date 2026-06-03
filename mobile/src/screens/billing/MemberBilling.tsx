import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { BillingPeriodNav } from './BillingPeriodNav';
import { BillingPeriod, MyBillingResponse } from '../../types/billing';

interface MemberBillingProps {
  data: MyBillingResponse | null;
  loading: boolean;
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MemberBilling({ data, loading, period, onPeriodChange }: MemberBillingProps) {
  const lines = data?.lines ?? [];
  const total = data?.total ?? 0;
  const currency = data?.currency ?? 'AUD';
  const isEmpty = !loading && lines.length === 0;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Period nav */}
        <View className="flex-row items-center justify-center">
          <BillingPeriodNav period={period} onChange={onPeriodChange} />
        </View>

        {/* Total */}
        <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Total This Period
          </Text>
          <Text
            testID="billing-total"
            className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground"
          >
            {currency} {total.toFixed(2)}
          </Text>
        </View>

        {/* Lines */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Sessions
          </Text>

          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <View key={i} className="rounded-xl bg-muted px-3 py-2 h-14 opacity-60" />
              ))}
            </>
          ) : isEmpty ? (
            <Text
              testID="billing-empty"
              className="text-[13px] text-foreground/65 text-center mt-4"
            >
              No completed sessions with a service type in this period.
            </Text>
          ) : (
            lines.map((line) => (
              <View
                key={line.sessionId}
                testID="billing-line"
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
              >
                <View className="gap-0.5 flex-1 mr-2">
                  <Text className="text-sm font-medium text-foreground">{line.serviceTypeName}</Text>
                  <Text className="text-xs text-foreground/65">
                    {formatDate(line.date)} · {line.startTime}–{line.endTime}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-foreground tabular-nums">
                  {line.currency} {line.price.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

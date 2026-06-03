import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { BillingPeriodNav } from './BillingPeriodNav';
import { BillingPeriod, BillingSummaryResponse } from '../../types/billing';

interface OwnerTrainerBillingProps {
  data: BillingSummaryResponse | null;
  loading: boolean;
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
}

export function OwnerTrainerBilling({
  data,
  loading,
  period,
  onPeriodChange,
}: OwnerTrainerBillingProps) {
  const members = data?.members ?? [];
  const grandTotal = data?.grandTotal ?? 0;
  const currency = data?.currency ?? 'AUD';
  const isEmpty = !loading && members.length === 0;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Period nav */}
        <View className="flex-row items-center justify-center">
          <BillingPeriodNav period={period} onChange={onPeriodChange} />
        </View>

        {/* Grand total */}
        <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Grand Total
          </Text>
          <Text
            testID="billing-grand-total"
            className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground"
          >
            {currency} {grandTotal.toFixed(2)}
          </Text>
        </View>

        {/* Member rows */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Members
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
            members.map((member) => (
              <View
                key={member.memberId}
                testID="billing-member-row"
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
              >
                <View className="gap-0.5 flex-1 mr-2">
                  <Text className="text-sm font-medium text-foreground">{member.name}</Text>
                  <Text className="text-xs text-foreground/65">
                    {member.sessionsCount} session{member.sessionsCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-foreground tabular-nums">
                  {member.currency} {member.totalAmount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

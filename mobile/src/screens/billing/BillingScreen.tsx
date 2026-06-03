import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { useAuthStore } from '../../stores/auth.store';
import { useBillingStore } from '../../stores/billing.store';
import { BillingPeriod } from '../../types/billing';
import { MemberBilling } from './MemberBilling';
import { OwnerTrainerBilling } from './OwnerTrainerBilling';

export function BillingScreen() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'member';

  const {
    period,
    myData,
    myLoading,
    summaryData,
    summaryLoading,
    setPeriod,
    fetchMy,
    fetchSummary,
  } = useBillingStore();

  useEffect(() => {
    if (role === 'member') {
      void fetchMy(period.from.toISOString(), period.to.toISOString());
    } else {
      void fetchSummary(period.from.toISOString(), period.to.toISOString());
    }
  }, [role, period, fetchMy, fetchSummary]);

  function handlePeriodChange(newPeriod: BillingPeriod) {
    const direction =
      newPeriod.from.getTime() > period.from.getTime() ? 'next' : 'prev';
    setPeriod(direction);
  }

  const subtitle = role === 'member' ? 'Your session billing' : 'Member billing summary';

  return (
    <Screen testID="screen-Billing">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Billing
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">{subtitle}</Text>
        </View>
      </View>

      {role === 'member' ? (
        <MemberBilling
          data={myData}
          loading={myLoading}
          period={period}
          onPeriodChange={handlePeriodChange}
        />
      ) : (
        <OwnerTrainerBilling
          data={summaryData}
          loading={summaryLoading}
          period={period}
          onPeriodChange={handlePeriodChange}
        />
      )}
    </Screen>
  );
}

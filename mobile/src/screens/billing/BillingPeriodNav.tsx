import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '~/components/ui/button';
import { BillingPeriod } from '../../types/billing';

function buildPeriod(year: number, month: number): BillingPeriod {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const label = from.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  return { from, to, label };
}

interface BillingPeriodNavProps {
  period: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}

export function BillingPeriodNav({ period, onChange }: BillingPeriodNavProps) {
  function handlePrev() {
    const year = period.from.getFullYear();
    const month = period.from.getMonth();
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    onChange(buildPeriod(newYear, newMonth));
  }

  function handleNext() {
    const year = period.from.getFullYear();
    const month = period.from.getMonth();
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    onChange(buildPeriod(newYear, newMonth));
  }

  return (
    <View className="flex-row items-center gap-2">
      <Button
        testID="billing-period-prev"
        variant="ghost"
        size="icon"
        onPress={handlePrev}
        accessibilityLabel="Previous month"
      >
        <Text className="text-[18px] text-foreground/65">{'‹'}</Text>
      </Button>

      <Text
        testID="billing-period-label"
        className="text-sm font-medium text-foreground min-w-[120px] text-center"
      >
        {period.label}
      </Text>

      <Button
        testID="billing-period-next"
        variant="ghost"
        size="icon"
        onPress={handleNext}
        accessibilityLabel="Next month"
      >
        <Text className="text-[18px] text-foreground/65">{'›'}</Text>
      </Button>
    </View>
  );
}

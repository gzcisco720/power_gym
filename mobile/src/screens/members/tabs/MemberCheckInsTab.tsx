import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { CheckIn, StuckToDiet } from '../../../types/check-ins';
import { wellnessAvg } from '../../../lib/check-ins/wellness';
import { CheckInScheduleForm } from './components/CheckInScheduleForm';
import { WellnessTrendChart } from './components/WellnessTrendChart';
import { DietComplianceHeatmap } from './components/DietComplianceHeatmap';

interface MemberCheckInsTabProps {
  memberId: string;
  checkIns: CheckIn[];
  onPressCheckIn: (checkIn: CheckIn) => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const DIET_LABEL: Record<StuckToDiet, string> = {
  yes: 'On track',
  partial: 'Partial',
  no: 'Off track',
};

const DIET_STYLE: Record<StuckToDiet, string> = {
  yes: 'text-emerald-300',
  partial: 'text-amber-300',
  no: 'text-rose-300',
};

export function MemberCheckInsTab({ memberId, checkIns, onPressCheckIn }: MemberCheckInsTabProps) {
  const showCharts = checkIns.length >= 2;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Schedule config form */}
        <CheckInScheduleForm memberId={memberId} />

        {/* Wellness trend chart — only when ≥2 check-ins */}
        {showCharts ? (
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Wellness Trend
            </Text>
            <WellnessTrendChart checkIns={checkIns} />
          </View>
        ) : null}

        {/* Diet compliance heatmap — only when ≥2 check-ins */}
        {showCharts ? (
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Diet Compliance
            </Text>
            <DietComplianceHeatmap checkIns={checkIns} />
          </View>
        ) : null}

        {/* Check-in list */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            History
          </Text>

          {checkIns.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No check-ins recorded yet.
            </Text>
          ) : (
            checkIns.map((checkIn) => (
              <Pressable
                key={checkIn._id}
                testID={`member-checkin-item-${checkIn._id}`}
                accessibilityRole="button"
                accessibilityLabel={`Check-in from ${formatDate(checkIn.submittedAt)}`}
                onPress={() => onPressCheckIn(checkIn)}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-foreground">
                    {formatDate(checkIn.submittedAt)}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text
                      testID={`checkin-row-avg-${checkIn._id}`}
                      className="text-xs font-semibold text-primary-light tabular-nums"
                    >
                      {`${wellnessAvg(checkIn)}/10`}
                    </Text>
                    {checkIn.weight !== null ? (
                      <Text className="text-xs text-foreground/65">{`${checkIn.weight} kg`}</Text>
                    ) : null}
                  </View>
                </View>

                <View className="flex-row items-center gap-2 mt-0.5 flex-wrap">
                  <Text className={`text-xs font-medium ${DIET_STYLE[checkIn.stuckToDiet]}`}>
                    {DIET_LABEL[checkIn.stuckToDiet]}
                  </Text>
                  {checkIn.photos.length > 0 ? (
                    <Text className="text-xs text-foreground/65">
                      {`${checkIn.photos.length} photos`}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { CheckIn } from '../../../types/check-ins';

interface MemberCheckInsTabProps {
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

export function MemberCheckInsTab({ checkIns, onPressCheckIn }: MemberCheckInsTabProps) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-2">
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
              className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
            >
              <Text className="text-sm font-medium text-foreground">
                {formatDate(checkIn.submittedAt)}
              </Text>
              <Text className="text-xs text-foreground/65">
                <Text className="text-foreground/65">S </Text>
                <Text className="text-primary-light">{checkIn.sleepQuality}</Text>
                <Text className="text-foreground/65"> · E </Text>
                <Text className="text-primary-light">{checkIn.energy}</Text>
                <Text className="text-foreground/65"> · St </Text>
                <Text className="text-primary-light">{checkIn.stress}</Text>
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

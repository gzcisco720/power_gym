import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useCheckInsStore } from '../../stores/check-ins.store';
import { CheckIn } from '../../types/check-ins';
import { AppStackParamList } from '../../navigation/index';

type CheckInScreenNav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatSubmittedAt(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calcWellnessAvg(checkIn: CheckIn): string {
  const sum =
    checkIn.sleepQuality +
    checkIn.energy +
    checkIn.recovery +
    checkIn.stress +
    checkIn.fatigue +
    checkIn.hunger +
    checkIn.digestion;
  return (sum / 7).toFixed(1);
}

export function CheckInScreen() {
  const navigation = useNavigation<CheckInScreenNav>();
  const { items, loading, fetchCheckIns, hasCheckedInThisWeek } = useCheckInsStore();
  const submitted = hasCheckedInThisWeek();
  const latestCheckIn = items[0] ?? null;

  useEffect(() => {
    void fetchCheckIns();
  }, [fetchCheckIns]);

  function handleStartCheckIn() {
    navigation.navigate('CheckInForm');
  }

  function handleHistoryRowPress(checkIn: CheckIn) {
    navigation.navigate('CheckInDetail', { checkIn });
  }

  return (
    <Screen testID="screen-CheckIn">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Check-In
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">Weekly wellness tracking</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-6">
          {/* This week status card */}
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              This Week
            </Text>
            {submitted ? (
              <View className="gap-1">
                <Text testID="checkin-submitted-label" className="text-sm font-semibold text-emerald-300">
                  Submitted ✓
                </Text>
                {latestCheckIn ? (
                  <Text className="text-xs text-foreground/65">
                    {formatSubmittedAt(latestCheckIn.submittedAt)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Pressable
                testID="checkin-start-button"
                onPress={handleStartCheckIn}
                accessibilityLabel="Start this week's check-in"
                accessibilityRole="button"
                className="bg-primary rounded-xl py-3 items-center"
              >
                <Text className="text-sm font-semibold text-foreground">
                  {"Start This Week's Check-In"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* History section */}
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Past Check-Ins
            </Text>

            {loading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <View key={i} className="rounded-xl bg-muted px-3 py-2 h-12 opacity-60" />
                ))}
              </>
            ) : items.length === 0 ? (
              <Text className="text-[13px] text-foreground/65 text-center mt-4">
                No check-ins yet.
              </Text>
            ) : (
              items.map((checkIn) => (
                <Pressable
                  key={checkIn._id}
                  testID={`checkin-history-item-${checkIn._id}`}
                  onPress={() => handleHistoryRowPress(checkIn)}
                  accessibilityLabel={`Check-in from ${formatDate(checkIn.submittedAt)}`}
                  accessibilityRole="button"
                  className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
                >
                  <Text className="text-sm font-medium text-foreground">
                    {formatDate(checkIn.submittedAt)}
                  </Text>
                  <Text className="text-sm font-semibold text-primary-light">
                    {calcWellnessAvg(checkIn)}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

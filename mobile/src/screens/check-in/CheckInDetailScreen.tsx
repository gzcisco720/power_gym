import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Modal } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { CheckIn, StuckToDiet } from '../../types/check-ins';
import { AppStackParamList } from '../../navigation/index';

type DetailRouteProp = RouteProp<AppStackParamList, 'CheckInDetail'>;

interface WellnessRow {
  label: string;
  key: keyof Pick<
    CheckIn,
    'sleepQuality' | 'energy' | 'recovery' | 'stress' | 'fatigue' | 'hunger' | 'digestion'
  >;
}

const WELLNESS_ROWS: WellnessRow[] = [
  { label: 'Sleep Quality', key: 'sleepQuality' },
  { label: 'Energy', key: 'energy' },
  { label: 'Recovery', key: 'recovery' },
  { label: 'Stress', key: 'stress' },
  { label: 'Fatigue', key: 'fatigue' },
  { label: 'Hunger', key: 'hunger' },
  { label: 'Digestion', key: 'digestion' },
];

interface BodyMetricConfig {
  label: string;
  key: keyof Pick<
    CheckIn,
    'weight' | 'waist' | 'steps' | 'exerciseMinutes' | 'walkRunDistance' | 'sleepHours'
  >;
  unit: string;
}

const BODY_METRIC_CONFIGS: BodyMetricConfig[] = [
  { label: 'Weight', key: 'weight', unit: 'kg' },
  { label: 'Waist', key: 'waist', unit: 'cm' },
  { label: 'Steps', key: 'steps', unit: '' },
  { label: 'Exercise', key: 'exerciseMinutes', unit: 'min' },
  { label: 'Walk/Run', key: 'walkRunDistance', unit: 'km' },
  { label: 'Sleep', key: 'sleepHours', unit: 'hrs' },
];

const DIET_BADGE: Record<StuckToDiet, { label: string; className: string }> = {
  yes: { label: 'Yes', className: 'bg-emerald-500/10 text-emerald-300' },
  partial: { label: 'Partial', className: 'bg-amber-500/10 text-amber-300' },
  no: { label: 'No', className: 'bg-destructive/10 text-destructive' },
};

function formatHeaderDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function CheckInDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRouteProp>();
  const { checkIn } = route.params ?? {};
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);

  if (!checkIn) return null;

  const visibleMetrics = BODY_METRIC_CONFIGS.filter((m) => checkIn[m.key] !== null);
  const badge = DIET_BADGE[checkIn.stuckToDiet];

  return (
    <Screen testID="screen-CheckInDetail">
      <ScreenHeader
        title={formatHeaderDate(checkIn.submittedAt)}
        onBack={() => navigation.goBack()}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-6">
          {/* Wellness section */}
          <View className="gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Wellness
            </Text>
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 gap-3">
              {WELLNESS_ROWS.map(({ label, key }) => {
                const value = checkIn[key] as number;
                return (
                  <View key={key} className="flex-row items-center justify-between">
                    <Text className="text-[13px] text-foreground/65">{label}</Text>
                    <View className="flex-row items-center gap-2">
                      {/* Static bar */}
                      <View className="w-24 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                        <View
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(value / 10) * 100}%` }}
                        />
                      </View>
                      <Text className="text-[13px] font-semibold text-primary-light w-8 text-right">
                        {value}/10
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Body Metrics — only if any values are non-null */}
          {visibleMetrics.length > 0 && (
            <View className="gap-3">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                Body Metrics
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {visibleMetrics.map(({ label, key, unit }) => (
                  <View
                    key={key}
                    className="flex-1 min-w-[44%] rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
                  >
                    <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                      {label}
                    </Text>
                    <Text className="text-sm font-semibold text-foreground mt-0.5">
                      {String(checkIn[key])}
                      {unit ? (
                        <Text className="text-xs text-foreground/65"> {unit}</Text>
                      ) : null}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Diet section */}
          <View className="gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Diet
            </Text>
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-foreground/65">Stuck to diet?</Text>
                <View className={`rounded-full px-3 py-1 ${badge.className.split(' ')[0]}`}>
                  <Text className={`text-xs font-semibold ${badge.className.split(' ')[1]}`}>
                    {badge.label}
                  </Text>
                </View>
              </View>

              {checkIn.dietDetails ? (
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-1">
                    Diet Details
                  </Text>
                  <Text className="text-sm text-foreground">{checkIn.dietDetails}</Text>
                </View>
              ) : null}

              {checkIn.wellbeing ? (
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-1">
                    Wellbeing
                  </Text>
                  <Text className="text-sm text-foreground">{checkIn.wellbeing}</Text>
                </View>
              ) : null}

              {checkIn.notes ? (
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-1">
                    Notes
                  </Text>
                  <Text className="text-sm text-foreground">{checkIn.notes}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Photos section */}
          {checkIn.photos.length > 0 && (
            <View className="gap-3">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                Photos
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {checkIn.photos.map((uri) => (
                    <Pressable
                      key={uri}
                      onPress={() => setFullscreenUri(uri)}
                      accessibilityLabel="View photo fullscreen"
                      accessibilityRole="button"
                    >
                      <Image
                        source={{ uri }}
                        className="w-14 h-14 rounded-lg"
                        accessibilityLabel="Check-in photo thumbnail"
                      />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen photo modal */}
      <Modal
        visible={fullscreenUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenUri(null)}
      >
        <Pressable
          className="flex-1 bg-black/90 items-center justify-center"
          onPress={() => setFullscreenUri(null)}
          accessibilityLabel="Close fullscreen photo"
          accessibilityRole="button"
        >
          {fullscreenUri ? (
            <Image
              source={{ uri: fullscreenUri }}
              className="w-full h-96"
              resizeMode="contain"
              accessibilityLabel="Full screen check-in photo"
            />
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}

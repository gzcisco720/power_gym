import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { WellnessSliders, WellnessValues } from './components/WellnessSliders';
import { BodyMetricsSection, BodyMetricsValues } from './components/BodyMetricsSection';
import { DietSection, DietValues } from './components/DietSection';
import { PhotosSection } from './components/PhotosSection';
import { useCheckInsStore } from '../../stores/check-ins.store';
import { createCheckIn } from '../../lib/api/check-ins.api';
import { CreateCheckInDto } from '../../types/check-ins';

const COLORS = { white: '#ffffff' } as const;

const DEFAULT_WELLNESS: WellnessValues = {
  sleepQuality: 5,
  energy: 5,
  recovery: 5,
  stress: 5,
  fatigue: 5,
  hunger: 5,
  digestion: 5,
};

const DEFAULT_BODY_METRICS: BodyMetricsValues = {
  weight: '',
  waist: '',
  steps: '',
  exerciseMinutes: '',
  walkRunDistance: '',
  sleepHours: '',
};

const DEFAULT_DIET: DietValues = {
  stuckToDiet: null,
  dietDetails: '',
  wellbeing: '',
  notes: '',
};

function parseOptionalNumber(val: string): number | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const num = parseFloat(trimmed);
  return isNaN(num) ? undefined : num;
}

export function CheckInFormScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const addItem = useCheckInsStore((s) => s.addItem);

  const [wellness, setWellness] = useState<WellnessValues>(DEFAULT_WELLNESS);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricsValues>(DEFAULT_BODY_METRICS);
  const [diet, setDiet] = useState<DietValues>(DEFAULT_DIET);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isValid = diet.stuckToDiet !== null;

  async function handleSubmit() {
    if (!isValid || submitting) return;
    if (!diet.stuckToDiet) return;

    setSubmitting(true);
    setErrorMsg(null);

    const dto: CreateCheckInDto = {
      sleepQuality: wellness.sleepQuality,
      energy: wellness.energy,
      recovery: wellness.recovery,
      stress: wellness.stress,
      fatigue: wellness.fatigue,
      hunger: wellness.hunger,
      digestion: wellness.digestion,
      stuckToDiet: diet.stuckToDiet,
      weight: parseOptionalNumber(bodyMetrics.weight),
      waist: parseOptionalNumber(bodyMetrics.waist),
      steps: parseOptionalNumber(bodyMetrics.steps),
      exerciseMinutes: parseOptionalNumber(bodyMetrics.exerciseMinutes),
      walkRunDistance: parseOptionalNumber(bodyMetrics.walkRunDistance),
      sleepHours: parseOptionalNumber(bodyMetrics.sleepHours),
      dietDetails: diet.dietDetails.trim() || undefined,
      wellbeing: diet.wellbeing.trim() || undefined,
      notes: diet.notes.trim() || undefined,
      photos: photos.length > 0 ? photos : undefined,
    };

    try {
      const result = await createCheckIn(dto);
      addItem(result);
      navigation.goBack();
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 409) {
        setErrorMsg("You've already submitted this week");
      } else {
        setErrorMsg('Failed to submit. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen testID="screen-CheckInForm">
      <ScreenHeader title="Weekly Check-In" onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-6">
          {/* Section 1: Wellness */}
          <View className="gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Wellness
            </Text>
            <WellnessSliders values={wellness} onChange={setWellness} />
          </View>

          {/* Section 2: Body Metrics */}
          <View className="gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Body Metrics (Optional)
            </Text>
            <BodyMetricsSection values={bodyMetrics} onChange={setBodyMetrics} />
          </View>

          {/* Section 3: Diet */}
          <View className="gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Diet
            </Text>
            <DietSection values={diet} onChange={setDiet} />
          </View>

          {/* Section 4: Photos */}
          <View className="gap-3">
            <PhotosSection photos={photos} onChange={setPhotos} />
          </View>

          {errorMsg ? (
            <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky bottom action bar */}
      <View
        className="border-t border-foreground/10 px-4 py-3"
        style={{ paddingBottom: insets.bottom || 12 }}
      >
        <Pressable
          testID="checkin-form-submit-button"
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          accessibilityLabel="Submit Check-In"
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid || submitting }}
          className={`py-3 rounded-xl items-center ${
            isValid && !submitting ? 'bg-primary' : 'bg-primary/40'
          }`}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text className="text-sm font-semibold text-foreground">Submit Check-In</Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

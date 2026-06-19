import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { MeasurementsSection } from './components/MeasurementsSection';
import { LivePreview } from './components/LivePreview';
import { useBodyTestsStore } from '../../stores/body-tests.store';
import { createBodyTest } from '../../lib/api/body-tests.api';
import { Protocol, Sex, CreateBodyTestDto } from '../../types/body-tests';
import { calculateBodyFat, calculateComposition } from '../../lib/body-test-formulas';


const PROTOCOLS: { id: Protocol; label: string; testID: string }[] = [
  { id: '3site', label: '3-Site', testID: 'protocol-3site' },
  { id: '7site', label: '7-Site', testID: 'protocol-7site' },
  { id: '9site', label: '9-Site', testID: 'protocol-9site' },
  { id: 'other', label: 'Other', testID: 'protocol-other' },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseNum(val: string): number | undefined {
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

function getRequiredMeasurementKeys(protocol: Protocol, sex: Sex | null): string[] {
  if (protocol === 'other') return ['bodyFatPct'];
  if (protocol === '3site') {
    if (sex === 'female') return ['tricep', 'suprailiac', 'thigh'];
    return ['chest', 'abdominal', 'thigh'];
  }
  if (protocol === '7site') {
    return ['chest', 'midaxillary', 'tricep', 'subscapular', 'abdominal', 'suprailiac', 'thigh'];
  }
  // 9site
  return ['tricep', 'chest', 'subscapular', 'abdominal', 'suprailiac', 'thigh', 'midaxillary', 'bicep', 'lumbar'];
}

export function AddBodyTestScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const addItem = useBodyTestsStore((s) => s.addItem);

  const [date] = useState(todayIso());
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [weight, setWeight] = useState('');
  const [protocol, setProtocol] = useState<Protocol>('3site');
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFatPct, setTargetBodyFatPct] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleMeasurementChange(key: string, value: string) {
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  }

  // When protocol changes, reset measurements
  function handleProtocolChange(p: Protocol) {
    setProtocol(p);
    setMeasurements({});
  }

  // Build numeric measurements map for formula
  const numericMeasurements = useMemo<Record<string, number | undefined>>(() => {
    const result: Record<string, number | undefined> = {};
    for (const [k, v] of Object.entries(measurements)) {
      result[k] = parseNum(v);
    }
    return result;
  }, [measurements]);

  // Live preview calculation
  const previewBodyFatPct = useMemo<number | null>(() => {
    if (!sex || !age || !weight) return null;
    const ageNum = parseNum(age);
    if (ageNum === undefined) return null;
    return calculateBodyFat(protocol, sex, ageNum, numericMeasurements);
  }, [protocol, sex, age, weight, numericMeasurements]);

  const previewComposition = useMemo(() => {
    if (previewBodyFatPct === null) return null;
    const w = parseNum(weight);
    if (w === undefined) return null;
    return calculateComposition(w, previewBodyFatPct);
  }, [previewBodyFatPct, weight]);

  // Validation
  const isValid = useMemo(() => {
    if (!date || !age || !sex || !weight) return false;
    if (!parseNum(age) || !parseNum(weight)) return false;
    const requiredKeys = getRequiredMeasurementKeys(protocol, sex);
    return requiredKeys.every((key) => {
      const v = measurements[key];
      return v !== undefined && v.trim() !== '' && parseNum(v) !== undefined;
    });
  }, [date, age, sex, weight, protocol, measurements]);

  async function handleSave() {
    if (!isValid || submitting || !sex) return;
    setSubmitting(true);
    setErrorMsg(null);

    const dto: CreateBodyTestDto = {
      date,
      age: parseNum(age)!,
      sex,
      weight: parseNum(weight)!,
      protocol,
      tricep: parseNum(measurements['tricep'] ?? ''),
      chest: parseNum(measurements['chest'] ?? ''),
      subscapular: parseNum(measurements['subscapular'] ?? ''),
      abdominal: parseNum(measurements['abdominal'] ?? ''),
      suprailiac: parseNum(measurements['suprailiac'] ?? ''),
      thigh: parseNum(measurements['thigh'] ?? ''),
      midaxillary: parseNum(measurements['midaxillary'] ?? ''),
      bicep: parseNum(measurements['bicep'] ?? ''),
      lumbar: parseNum(measurements['lumbar'] ?? ''),
      bodyFatPct: parseNum(measurements['bodyFatPct'] ?? ''),
      targetWeight: parseNum(targetWeight),
      targetBodyFatPct: parseNum(targetBodyFatPct),
    };

    try {
      const result = await createBodyTest(dto);
      addItem(result);
      setSuccessMsg('Body test saved');
      setTimeout(() => navigation.goBack(), 600);
    } catch {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen testID="screen-AddBodyTest">
      <ScreenHeader title="New Body Test" onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-6">
          {/* Basic Info */}
          <View className="gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Basic Info
            </Text>

            {/* Age */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                Age
              </Text>
              <Input
                testID="body-test-age-input"
                value={age}
                onChangeText={setAge}
                keyboardType="decimal-pad"
                placeholder="Years"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
                accessibilityLabel="Age"
              />
            </View>

            {/* Sex */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                Sex
              </Text>
              <View className="flex-row gap-2">
                {(['male', 'female'] as Sex[]).map((s) => (
                  <Pressable
                    key={s}
                    testID={`sex-${s}`}
                    onPress={() => { setSex(s); setMeasurements({}); }}
                    accessibilityLabel={s === 'male' ? 'Male' : 'Female'}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sex === s }}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${
                      sex === s ? 'bg-primary border-primary' : 'bg-input border-transparent'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        sex === s ? 'text-foreground' : 'text-foreground/65'
                      }`}
                    >
                      {s === 'male' ? 'M' : 'F'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Weight */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                Weight (kg)
              </Text>
              <Input
                testID="body-test-weight-input"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="kg"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
                accessibilityLabel="Weight in kg"
              />
            </View>
          </View>

          {/* Protocol selector */}
          <View className="gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Protocol
            </Text>
            <View className="flex-row gap-2">
              {PROTOCOLS.map(({ id, label, testID }) => (
                <Pressable
                  key={id}
                  testID={testID}
                  onPress={() => handleProtocolChange(id)}
                  accessibilityLabel={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: protocol === id }}
                  className={`flex-1 py-2 rounded-xl items-center ${
                    protocol === id ? 'bg-primary' : 'bg-input'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      protocol === id ? 'text-foreground' : 'text-foreground/65'
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Measurements */}
          <View className="gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Measurements
            </Text>
            <MeasurementsSection
              protocol={protocol}
              sex={sex}
              values={measurements}
              onChange={handleMeasurementChange}
            />
          </View>

          {/* Live Preview */}
          <LivePreview
            bodyFatPct={previewBodyFatPct}
            fatMassKg={previewComposition?.fatMassKg ?? null}
            leanMassKg={previewComposition?.leanMassKg ?? null}
          />

          {/* Goals (optional) */}
          <View className="gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Goals (Optional)
            </Text>
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                Target Weight (kg)
              </Text>
              <Input
                value={targetWeight}
                onChangeText={setTargetWeight}
                keyboardType="decimal-pad"
                placeholder="kg"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
                accessibilityLabel="Target weight in kg"
              />
            </View>
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                Target Body Fat %
              </Text>
              <Input
                value={targetBodyFatPct}
                onChangeText={setTargetBodyFatPct}
                keyboardType="decimal-pad"
                placeholder="%"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
                accessibilityLabel="Target body fat percentage"
              />
            </View>
          </View>

          {successMsg ? (
            <Text className="text-xs text-emerald-300 text-center">{successMsg}</Text>
          ) : errorMsg ? (
            <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky bottom action bar */}
      <View
        className="border-t border-foreground/10 px-4 py-3"
        style={{ paddingBottom: insets.bottom || 12 }}
      >
        <Button
          testID="bodytest-save-button"
          onPress={handleSave}
          disabled={!isValid || submitting}
          accessibilityLabel="Save body test"
          className="py-3 rounded-xl"
        >
          <Text className="text-sm font-semibold text-foreground">
            {submitting ? 'Saving…' : 'Save Test'}
          </Text>
        </Button>
      </View>
    </Screen>
  );
}

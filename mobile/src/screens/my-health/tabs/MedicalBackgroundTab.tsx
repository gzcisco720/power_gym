import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHealthStore } from '../../../stores/health.store';
import { PregnancyStatus, UpdateMedicalHistoryDto } from '../../../types/health';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';

const PREGNANCY_OPTIONS: Array<{ value: PregnancyStatus; label: string }> = [
  { value: 'n/a', label: 'N/A' },
  { value: 'not_pregnant', label: 'Not Pregnant' },
  { value: 'pregnant', label: 'Pregnant' },
  { value: 'postpartum', label: 'Postpartum' },
];

export function MedicalBackgroundTab() {
  const insets = useSafeAreaInsets();
  const { medicalHistory, medicalHistoryLoading, fetchMedicalHistory, saveMedicalHistory } =
    useHealthStore();

  useEffect(() => {
    void fetchMedicalHistory();
  }, [fetchMedicalHistory]);

  const [chronicConditions, setChronicConditions] = useState<string[]>(
    medicalHistory?.chronicConditions ?? [],
  );
  const [conditionInput, setConditionInput] = useState('');
  const [surgeries, setSurgeries] = useState(medicalHistory?.surgeries ?? '');
  const [allergies, setAllergies] = useState(medicalHistory?.allergies ?? '');
  const [familyHistory, setFamilyHistory] = useState(medicalHistory?.familyHistory ?? '');
  const [currentDoctor, setCurrentDoctor] = useState(medicalHistory?.currentDoctor ?? '');
  const [emergencyContact, setEmergencyContact] = useState(medicalHistory?.emergencyContact ?? '');
  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus | null>(
    medicalHistory?.pregnancyStatus ?? null,
  );

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (medicalHistory) {
      setChronicConditions(medicalHistory.chronicConditions);
      setSurgeries(medicalHistory.surgeries ?? '');
      setAllergies(medicalHistory.allergies ?? '');
      setFamilyHistory(medicalHistory.familyHistory ?? '');
      setCurrentDoctor(medicalHistory.currentDoctor ?? '');
      setEmergencyContact(medicalHistory.emergencyContact ?? '');
      setPregnancyStatus(medicalHistory.pregnancyStatus ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicalHistory?._id]);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        chronicConditions: medicalHistory?.chronicConditions ?? [],
        surgeries: medicalHistory?.surgeries ?? '',
        allergies: medicalHistory?.allergies ?? '',
        familyHistory: medicalHistory?.familyHistory ?? '',
        currentDoctor: medicalHistory?.currentDoctor ?? '',
        emergencyContact: medicalHistory?.emergencyContact ?? '',
        pregnancyStatus: medicalHistory?.pregnancyStatus ?? null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [medicalHistory?._id],
  );

  const currentSnapshot = JSON.stringify({
    chronicConditions,
    surgeries,
    allergies,
    familyHistory,
    currentDoctor,
    emergencyContact,
    pregnancyStatus,
  });

  const isDirty = currentSnapshot !== initialSnapshot;

  function handleAddCondition() {
    const trimmed = conditionInput.trim();
    if (!trimmed) return;
    setChronicConditions((prev) => [...prev, trimmed]);
    setConditionInput('');
  }

  function handleRemoveCondition(index: number) {
    setChronicConditions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!isDirty) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const dto: UpdateMedicalHistoryDto = {
      chronicConditions,
      ...(surgeries.trim() ? { surgeries: surgeries.trim() } : {}),
      ...(allergies.trim() ? { allergies: allergies.trim() } : {}),
      ...(familyHistory.trim() ? { familyHistory: familyHistory.trim() } : {}),
      ...(currentDoctor.trim() ? { currentDoctor: currentDoctor.trim() } : {}),
      ...(emergencyContact.trim() ? { emergencyContact: emergencyContact.trim() } : {}),
      ...(pregnancyStatus ? { pregnancyStatus } : {}),
    };

    try {
      await saveMedicalHistory(dto);
      setSuccessMsg('Saved');
    } catch {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (medicalHistoryLoading) {
    return (
      <View className="px-4 py-4 gap-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-4">
          {/* Chronic Conditions */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Chronic Conditions
            </Text>

            {chronicConditions.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5 mb-1">
                {chronicConditions.map((condition, index) => (
                  <View
                    key={`${condition}-${index}`}
                    testID={`condition-chip-${index}`}
                    className="flex-row items-center gap-1 bg-primary/10 rounded-full px-2.5 py-1"
                  >
                    <Text className="text-xs font-medium text-primary-light">{condition}</Text>
                    <Pressable
                      testID={`condition-chip-remove-${index}`}
                      onPress={() => handleRemoveCondition(index)}
                      accessibilityLabel={`Remove ${condition}`}
                      accessibilityRole="button"
                    >
                      <Text className="text-xs text-primary-light">×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <View className="flex-row gap-2">
              <Input
                testID="background-condition-input"
                value={conditionInput}
                onChangeText={setConditionInput}
                placeholder="e.g. Asthma"
                autoCapitalize="sentences"
                accessibilityLabel="Add chronic condition"
                onSubmitEditing={handleAddCondition}
                className="flex-1"
              />
              <Button
                testID="background-condition-add-btn"
                onPress={handleAddCondition}
                accessibilityLabel="Add condition"
                size="sm"
              >
                <Text className="text-xs font-semibold text-foreground">Add</Text>
              </Button>
            </View>
          </View>

          {/* Surgeries */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Surgeries <Text className="text-foreground/65">(optional)</Text>
            </Text>
            <Input
              testID="background-surgeries-input"
              value={surgeries}
              onChangeText={setSurgeries}
              placeholder="Any previous surgeries..."
              accessibilityLabel="Surgeries"
              multiline
            />
          </View>

          {/* Allergies */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Allergies <Text className="text-foreground/65">(optional)</Text>
            </Text>
            <Input
              testID="background-allergies-input"
              value={allergies}
              onChangeText={setAllergies}
              placeholder="e.g. Penicillin, peanuts"
              accessibilityLabel="Allergies"
              multiline
            />
          </View>

          {/* Family History */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Family History <Text className="text-foreground/65">(optional)</Text>
            </Text>
            <Input
              testID="background-family-history-input"
              value={familyHistory}
              onChangeText={setFamilyHistory}
              placeholder="Relevant family medical history..."
              accessibilityLabel="Family history"
              multiline
            />
          </View>

          {/* Current Doctor */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Current Doctor <Text className="text-foreground/65">(optional)</Text>
            </Text>
            <Input
              testID="background-doctor-input"
              value={currentDoctor}
              onChangeText={setCurrentDoctor}
              placeholder="e.g. Dr. Smith"
              autoCapitalize="words"
              accessibilityLabel="Current doctor"
            />
          </View>

          {/* Emergency Contact */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Emergency Contact <Text className="text-foreground/65">(optional)</Text>
            </Text>
            <Input
              testID="background-emergency-contact-input"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              placeholder="Name and phone number"
              autoCapitalize="words"
              accessibilityLabel="Emergency contact"
            />
          </View>

          {/* Pregnancy Status */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Pregnancy Status
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {PREGNANCY_OPTIONS.map((opt) => {
                const isSelected = pregnancyStatus === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    testID={`background-pregnancy-${opt.value.replace('/', '-')}`}
                    onPress={() => setPregnancyStatus(isSelected ? null : opt.value)}
                    accessibilityLabel={opt.label}
                    accessibilityRole="button"
                    className={`px-3 py-1.5 rounded-lg ${isSelected ? 'bg-primary' : 'bg-input'}`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        isSelected ? 'text-foreground' : 'text-foreground/65'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {successMsg ? (
            <Text className="text-xs text-emerald-300 text-center">{successMsg}</Text>
          ) : errorMsg ? (
            <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky save button */}
      <View
        className="border-t border-foreground/10 bg-background/95 px-4 py-3"
        style={{ paddingBottom: insets.bottom || 12 }}
      >
        <Button
          testID="background-save-btn"
          onPress={() => void handleSave()}
          disabled={!isDirty || isSaving}
          accessibilityLabel="Save medical background"
          accessibilityState={{ disabled: !isDirty || isSaving }}
          className="w-full"
        >
          <Text className="text-sm font-semibold text-foreground">Save</Text>
        </Button>
      </View>
    </View>
  );
}

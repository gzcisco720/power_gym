import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Medication,
  CreateMedicationDto,
  UpdateMedicationDto,
  MedicationDuration,
} from '../../../types/health';

const WHITE = '#ffffff';

const DURATIONS: Array<{ value: MedicationDuration; label: string }> = [
  { value: 'long_term', label: 'Long-term' },
  { value: 'short_term', label: 'Short-term' },
];

interface MedicationBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  medication?: Medication;
  onSave: (dto: CreateMedicationDto | UpdateMedicationDto) => Promise<void>;
}

export function MedicationBottomSheet({
  visible,
  onClose,
  medication,
  onSave,
}: MedicationBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const isEdit = medication !== undefined;

  const [name, setName] = useState(medication?.name ?? '');
  const [purpose, setPurpose] = useState(medication?.purpose ?? '');
  const [duration, setDuration] = useState<MedicationDuration>(
    medication?.duration ?? 'short_term',
  );
  const [startDate, setStartDate] = useState(medication?.startDate?.slice(0, 10) ?? '');
  const [endDate, setEndDate] = useState(medication?.endDate?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(medication?.notes ?? '');

  const [nameError, setNameError] = useState<string | null>(null);
  const [purposeError, setPurposeError] = useState<string | null>(null);
  const [startDateError, setStartDateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(medication?.name ?? '');
      setPurpose(medication?.purpose ?? '');
      setDuration(medication?.duration ?? 'short_term');
      setStartDate(medication?.startDate?.slice(0, 10) ?? '');
      setEndDate(medication?.endDate?.slice(0, 10) ?? '');
      setNotes(medication?.notes ?? '');
      setNameError(null);
      setPurposeError(null);
      setStartDateError(null);
      setErrorMsg(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, medication?._id]);

  function handleClose() {
    onClose();
  }

  async function handleSave() {
    let hasError = false;
    if (!name.trim()) {
      setNameError('Name is required');
      hasError = true;
    }
    if (!purpose.trim()) {
      setPurposeError('Purpose is required');
      hasError = true;
    }
    if (!startDate.trim()) {
      setStartDateError('Start date is required');
      hasError = true;
    }
    if (hasError) return;

    setIsSaving(true);
    setErrorMsg(null);

    const dto: CreateMedicationDto = {
      name: name.trim(),
      purpose: purpose.trim(),
      duration,
      startDate: startDate.trim(),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    try {
      await onSave(dto);
      handleClose();
    } catch {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      testID="medication-bottom-sheet"
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View
          className="rounded-t-2xl bg-card"
          style={{ paddingBottom: insets.bottom + 16, maxHeight: '90%' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-foreground/[.06]">
            <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
              {isEdit ? 'Edit Medication' : 'Add Medication'}
            </Text>
            <Pressable
              testID="medication-sheet-cancel"
              onPress={handleClose}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text className="text-sm text-foreground/65">Cancel</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="px-4 py-4 gap-4">
              {/* Name (required) */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Name <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="medication-name-input"
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="e.g. Ibuprofen"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                  autoCapitalize="words"
                  accessibilityLabel="Medication name"
                  aria-invalid={nameError != null}
                />
                {nameError ? (
                  <Text testID="medication-name-error" className="text-xs text-destructive">
                    {nameError}
                  </Text>
                ) : null}
              </View>

              {/* Purpose (required) */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Purpose <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="medication-purpose-input"
                  value={purpose}
                  onChangeText={(t) => {
                    setPurpose(t);
                    if (purposeError) setPurposeError(null);
                  }}
                  placeholder="e.g. Pain relief"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                  autoCapitalize="sentences"
                  accessibilityLabel="Medication purpose"
                  aria-invalid={purposeError != null}
                />
                {purposeError ? (
                  <Text testID="medication-purpose-error" className="text-xs text-destructive">
                    {purposeError}
                  </Text>
                ) : null}
              </View>

              {/* Duration (required) */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Duration <Text className="text-destructive">*</Text>
                </Text>
                <View className="flex-row gap-2">
                  {DURATIONS.map((opt) => {
                    const isSelected = duration === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        testID={`medication-duration-${opt.value}`}
                        onPress={() => setDuration(opt.value)}
                        accessibilityLabel={opt.label}
                        accessibilityRole="button"
                        className={`flex-1 items-center py-2 rounded-xl ${
                          isSelected ? 'bg-primary' : 'bg-input'
                        }`}
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

              {/* Start Date (required) */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Start Date <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="medication-start-date-input"
                  value={startDate}
                  onChangeText={(t) => {
                    setStartDate(t);
                    if (startDateError) setStartDateError(null);
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numbers-and-punctuation"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                  accessibilityLabel="Start date"
                  aria-invalid={startDateError != null}
                />
                {startDateError ? (
                  <Text testID="medication-start-date-error" className="text-xs text-destructive">
                    {startDateError}
                  </Text>
                ) : null}
              </View>

              {/* End Date (optional) */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  End Date <Text className="text-foreground/65">(optional)</Text>
                </Text>
                <TextInput
                  testID="medication-end-date-input"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numbers-and-punctuation"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                  accessibilityLabel="End date"
                />
              </View>

              {/* Notes (optional) */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Notes <Text className="text-foreground/65">(optional)</Text>
                </Text>
                <TextInput
                  testID="medication-notes-input"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional notes..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                  multiline
                  accessibilityLabel="Notes"
                />
              </View>

              {/* Error feedback */}
              {errorMsg ? (
                <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
              ) : null}
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="px-4 py-3 border-t border-foreground/10 bg-background/95">
            <Pressable
              testID="medication-save-button"
              onPress={handleSave}
              disabled={isSaving}
              accessibilityLabel="Save medication"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSaving }}
              className={`py-3 rounded-xl items-center ${isSaving ? 'bg-primary/40' : 'bg-primary'}`}
            >
              {isSaving ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text className="text-sm font-semibold text-foreground">Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

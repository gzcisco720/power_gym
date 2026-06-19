import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Medication,
  CreateMedicationDto,
  UpdateMedicationDto,
  MedicationDuration,
} from '../../../types/health';

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
            <Button
              testID="medication-sheet-cancel"
              onPress={handleClose}
              accessibilityLabel="Cancel"
              variant="ghost"
              size="sm"
            >
              <Text className="text-sm text-foreground/65">Cancel</Text>
            </Button>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="px-4 py-4 gap-4">
              {/* Name (required) */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Name <Text className="text-destructive">*</Text>
                </Text>
                <Input
                  testID="medication-name-input"
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="e.g. Ibuprofen"
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
                <Input
                  testID="medication-purpose-input"
                  value={purpose}
                  onChangeText={(t) => {
                    setPurpose(t);
                    if (purposeError) setPurposeError(null);
                  }}
                  placeholder="e.g. Pain relief"
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
                <Input
                  testID="medication-start-date-input"
                  value={startDate}
                  onChangeText={(t) => {
                    setStartDate(t);
                    if (startDateError) setStartDateError(null);
                  }}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
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
                <Input
                  testID="medication-end-date-input"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel="End date"
                />
              </View>

              {/* Notes (optional) */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Notes <Text className="text-foreground/65">(optional)</Text>
                </Text>
                <Input
                  testID="medication-notes-input"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional notes..."
                  accessibilityLabel="Notes"
                  multiline
                />
              </View>

              {errorMsg ? (
                <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
              ) : null}
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="px-4 py-3 border-t border-foreground/10 bg-background/95">
            <Button
              testID="medication-save-button"
              onPress={() => void handleSave()}
              disabled={isSaving}
              accessibilityLabel="Save medication"
              accessibilityState={{ disabled: isSaving }}
              className="w-full"
            >
              <Text className="text-sm font-semibold text-foreground">Save</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

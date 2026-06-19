import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useHealthStore } from '../../../stores/health.store';
import { Medication, CreateMedicationDto, UpdateMedicationDto } from '../../../types/health';
import { MedicationCard } from '../components/MedicationCard';
import { MedicationBottomSheet } from '../components/MedicationBottomSheet';
import { Button } from '~/components/ui/button';

interface ConfirmDialogProps {
  visible: boolean;
  message: string;
  confirmTestID: string;
  cancelTestID: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  visible,
  message,
  confirmTestID,
  cancelTestID,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!visible) return null;

  return (
    <View
      testID="medications-confirm-overlay"
      className="absolute inset-0 z-50 items-center justify-center bg-black/60 px-6"
    >
      <View className="w-full rounded-2xl bg-card px-6 pb-6 pt-6 gap-4">
        <Text className="text-sm text-foreground/65 text-center">{message}</Text>
        <View className="flex-row gap-3">
          <Button
            testID={cancelTestID}
            onPress={onCancel}
            accessibilityLabel="Cancel"
            variant="secondary"
            className="flex-1"
          >
            <Text className="text-sm font-medium text-foreground/65">Cancel</Text>
          </Button>
          <Button
            testID={confirmTestID}
            onPress={onConfirm}
            accessibilityLabel="Confirm"
            className="flex-1"
          >
            <Text className="text-sm font-semibold text-foreground">Confirm</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

type DialogState =
  | { type: 'none' }
  | { type: 'end'; medication: Medication }
  | { type: 'delete'; medication: Medication };

export function MedicationsTab() {
  const { medications, medicationsLoading, fetchMedications, addMedication, updateMedication, deleteMedication } =
    useHealthStore();

  const [endedExpanded, setEndedExpanded] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | undefined>(undefined);
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  useEffect(() => {
    void fetchMedications();
  }, [fetchMedications]);

  const activeMedications = medications.filter((m) => m.status === 'active');
  const endedMedications = medications.filter((m) => m.status === 'ended');

  async function handleSave(dto: CreateMedicationDto | UpdateMedicationDto) {
    if (editingMedication) {
      await updateMedication(editingMedication._id, dto as UpdateMedicationDto);
    } else {
      await addMedication(dto as CreateMedicationDto);
    }
  }

  function handleOpenCreate() {
    setEditingMedication(undefined);
    setSheetVisible(true);
  }

  function handleOpenEdit(medication: Medication) {
    setEditingMedication(medication);
    setSheetVisible(true);
  }

  function handleCloseSheet() {
    setSheetVisible(false);
    setEditingMedication(undefined);
  }

  async function handleConfirmEnd() {
    if (dialog.type !== 'end') return;
    await updateMedication(dialog.medication._id, { status: 'ended' });
    setDialog({ type: 'none' });
  }

  async function handleConfirmDelete() {
    if (dialog.type !== 'delete') return;
    await deleteMedication(dialog.medication._id);
    setDialog({ type: 'none' });
  }

  if (medicationsLoading) {
    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-2">
          {[0, 1, 2].map((i) => (
            <View key={i} testID="medications-skeleton-row" className="rounded-xl bg-muted h-16 opacity-60" />
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1">
      {/* Header action */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-foreground/[.06]">
        <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
          Active Medications
        </Text>
        <Button
          testID="medications-add-btn"
          onPress={handleOpenCreate}
          accessibilityLabel="Add medication"
          size="sm"
        >
          <Text className="text-xs font-semibold text-foreground">+ Add Medication</Text>
        </Button>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-2">
          {/* Active medications list */}
          {activeMedications.length === 0 ? (
            <View className="rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10 items-center">
              <Text className="text-[13px] text-foreground/65">No active medications</Text>
            </View>
          ) : (
            activeMedications.map((medication) => (
              <MedicationCard
                key={medication._id}
                medication={medication}
                onEdit={() => handleOpenEdit(medication)}
                onEnd={() => setDialog({ type: 'end', medication })}
                onDelete={() => setDialog({ type: 'delete', medication })}
              />
            ))
          )}

          {/* Ended section */}
          {endedMedications.length > 0 ? (
            <View className="gap-2 mt-2">
              <Pressable
                testID="medications-ended-toggle"
                onPress={() => setEndedExpanded((v) => !v)}
                accessibilityLabel={`Ended · ${endedMedications.length}`}
                accessibilityRole="button"
                className="flex-row items-center gap-2"
              >
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                  {`Ended · ${endedMedications.length}`}
                </Text>
                <Text className="text-xs text-foreground/40">
                  {endedExpanded ? '▲' : '▼'}
                </Text>
              </Pressable>

              {endedExpanded
                ? endedMedications.map((medication) => (
                    <MedicationCard
                      key={medication._id}
                      medication={medication}
                      onEdit={() => handleOpenEdit(medication)}
                      onEnd={() => setDialog({ type: 'end', medication })}
                      onDelete={() => setDialog({ type: 'delete', medication })}
                    />
                  ))
                : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom sheet */}
      <MedicationBottomSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        medication={editingMedication}
        onSave={handleSave}
      />

      {/* End confirmation */}
      <ConfirmDialog
        visible={dialog.type === 'end'}
        message="This will mark the medication as ended."
        confirmTestID="medication-end-confirm-btn"
        cancelTestID="medication-end-cancel-btn"
        onConfirm={() => void handleConfirmEnd()}
        onCancel={() => setDialog({ type: 'none' })}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        visible={dialog.type === 'delete'}
        message="This cannot be undone."
        confirmTestID="medication-delete-confirm-btn"
        cancelTestID="medication-delete-cancel-btn"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDialog({ type: 'none' })}
      />
    </View>
  );
}

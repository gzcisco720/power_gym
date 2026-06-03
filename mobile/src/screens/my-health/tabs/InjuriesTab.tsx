import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useHealthStore } from '../../../stores/health.store';
import { Injury, CreateInjuryDto, UpdateInjuryDto } from '../../../types/health';
import { InjuryCard } from '../components/InjuryCard';
import { InjuryBottomSheet } from '../components/InjuryBottomSheet';

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
      testID="injuries-confirm-overlay"
      className="absolute inset-0 z-50 items-center justify-center bg-black/60 px-6"
    >
      <View className="w-full rounded-2xl bg-card px-6 pb-6 pt-6 gap-4">
        <Text className="text-sm text-foreground/65 text-center">{message}</Text>
        <View className="flex-row gap-3">
          <Pressable
            testID={cancelTestID}
            onPress={onCancel}
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            className="flex-1 py-2.5 rounded-xl bg-muted items-center"
          >
            <Text className="text-sm font-medium text-foreground/65">Cancel</Text>
          </Pressable>
          <Pressable
            testID={confirmTestID}
            onPress={onConfirm}
            accessibilityLabel="Confirm"
            accessibilityRole="button"
            className="flex-1 py-2.5 rounded-xl bg-primary items-center"
          >
            <Text className="text-sm font-semibold text-foreground">Confirm</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type DialogState =
  | { type: 'none' }
  | { type: 'resolve'; injury: Injury }
  | { type: 'reopen'; injury: Injury }
  | { type: 'delete'; injury: Injury };

export function InjuriesTab() {
  const { injuries, injuriesLoading, fetchInjuries, addInjury, updateInjury, deleteInjury } =
    useHealthStore();

  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingInjury, setEditingInjury] = useState<Injury | undefined>(undefined);
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  useEffect(() => {
    void fetchInjuries();
  }, [fetchInjuries]);

  const activeInjuries = injuries.filter((i) => i.status === 'active');
  const resolvedInjuries = injuries.filter((i) => i.status === 'resolved');

  async function handleSave(dto: CreateInjuryDto | UpdateInjuryDto) {
    if (editingInjury) {
      await updateInjury(editingInjury._id, dto as UpdateInjuryDto);
    } else {
      await addInjury(dto as CreateInjuryDto);
    }
  }

  function handleOpenCreate() {
    setEditingInjury(undefined);
    setSheetVisible(true);
  }

  function handleOpenEdit(injury: Injury) {
    setEditingInjury(injury);
    setSheetVisible(true);
  }

  function handleCloseSheet() {
    setSheetVisible(false);
    setEditingInjury(undefined);
  }

  async function handleConfirmResolve() {
    if (dialog.type !== 'resolve') return;
    await updateInjury(dialog.injury._id, { status: 'resolved' });
    setDialog({ type: 'none' });
  }

  async function handleConfirmReopen() {
    if (dialog.type !== 'reopen') return;
    await updateInjury(dialog.injury._id, { status: 'active' });
    setDialog({ type: 'none' });
  }

  async function handleConfirmDelete() {
    if (dialog.type !== 'delete') return;
    await deleteInjury(dialog.injury._id);
    setDialog({ type: 'none' });
  }

  if (injuriesLoading) {
    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-2">
          {[0, 1, 2].map((i) => (
            <View key={i} testID="injuries-skeleton-row" className="rounded-xl bg-muted h-16 opacity-60" />
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
          Active Injuries
        </Text>
        <Pressable
          testID="injuries-report-btn"
          onPress={handleOpenCreate}
          accessibilityLabel="Report injury"
          accessibilityRole="button"
          className="bg-primary rounded-lg px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-foreground">+ Report Injury</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-2">
          {/* Active injuries list */}
          {activeInjuries.length === 0 ? (
            <View className="rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10 items-center">
              <Text className="text-[13px] text-foreground/65">No active injuries</Text>
            </View>
          ) : (
            activeInjuries.map((injury) => (
              <InjuryCard
                key={injury._id}
                injury={injury}
                onEdit={() => handleOpenEdit(injury)}
                onResolve={() => setDialog({ type: 'resolve', injury })}
                onDelete={() => setDialog({ type: 'delete', injury })}
              />
            ))
          )}

          {/* History section */}
          {resolvedInjuries.length > 0 ? (
            <View className="gap-2 mt-2">
              <Pressable
                testID="injuries-history-toggle"
                onPress={() => setHistoryExpanded((v) => !v)}
                accessibilityLabel={`History · ${resolvedInjuries.length} resolved`}
                accessibilityRole="button"
                className="flex-row items-center gap-2"
              >
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                  {`History · ${resolvedInjuries.length} resolved`}
                </Text>
                <Text className="text-xs text-foreground/40">
                  {historyExpanded ? '▲' : '▼'}
                </Text>
              </Pressable>

              {historyExpanded
                ? resolvedInjuries.map((injury) => (
                    <InjuryCard
                      key={injury._id}
                      injury={injury}
                      onEdit={() => handleOpenEdit(injury)}
                      onResolve={() => setDialog({ type: 'reopen', injury })}
                      onDelete={() => setDialog({ type: 'delete', injury })}
                    />
                  ))
                : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom sheet */}
      <InjuryBottomSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        injury={editingInjury}
        onSave={handleSave}
      />

      {/* Resolve confirmation */}
      <ConfirmDialog
        visible={dialog.type === 'resolve'}
        message="This will move the record to History. You can reopen it anytime."
        confirmTestID="injury-resolve-confirm-btn"
        cancelTestID="injury-resolve-cancel-btn"
        onConfirm={() => void handleConfirmResolve()}
        onCancel={() => setDialog({ type: 'none' })}
      />

      {/* Reopen confirmation */}
      <ConfirmDialog
        visible={dialog.type === 'reopen'}
        message="This will move the injury back to active."
        confirmTestID="injury-reopen-confirm-btn"
        cancelTestID="injury-reopen-cancel-btn"
        onConfirm={() => void handleConfirmReopen()}
        onCancel={() => setDialog({ type: 'none' })}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        visible={dialog.type === 'delete'}
        message="This cannot be undone."
        confirmTestID="injury-delete-confirm-btn"
        cancelTestID="injury-delete-cancel-btn"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDialog({ type: 'none' })}
      />
    </View>
  );
}

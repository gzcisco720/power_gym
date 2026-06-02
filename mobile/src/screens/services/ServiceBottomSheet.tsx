import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useServiceTypesStore } from '../../stores/service-types.store';
import { createServiceType, updateServiceType } from '../../lib/api/service-types.api';
import { ServiceType } from '../../types/service-types';

const COLORS = { white: '#ffffff' } as const;

interface ServiceBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  service?: ServiceType;
}

export function ServiceBottomSheet({ visible, onClose, service }: ServiceBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const addItem = useServiceTypesStore((s) => s.addItem);
  const updateItem = useServiceTypesStore((s) => s.updateItem);

  const isEdit = service !== undefined;

  const [name, setName] = useState(service?.name ?? '');
  const [duration, setDuration] = useState(service ? String(service.durationMin) : '');
  const [price, setPrice] = useState(service ? String(service.pricePerSession) : '');
  const [note, setNote] = useState(service?.note ?? '');
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // JSON snapshot for dirty detection in Edit mode
  const initialSnapshot = useMemo(() => {
    if (!isEdit) return '';
    return JSON.stringify({
      name: service.name,
      duration: String(service.durationMin),
      price: String(service.pricePerSession),
      note: service.note ?? '',
      isActive: service.isActive,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, service?._id]);

  const currentSnapshot = JSON.stringify({ name, duration, price, note, isActive });
  const isDirty = isEdit ? currentSnapshot !== initialSnapshot : false;

  const requiredFilled = name.trim().length > 0 && duration.trim().length > 0 && price.trim().length > 0;
  const canSave = isEdit ? isDirty && requiredFilled : requiredFilled;

  function handleClose() {
    setName(service?.name ?? '');
    setDuration(service ? String(service.durationMin) : '');
    setPrice(service ? String(service.pricePerSession) : '');
    setNote(service?.note ?? '');
    setIsActive(service?.isActive ?? true);
    setErrorMsg(null);
    onClose();
  }

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      if (isEdit && service) {
        const updated = await updateServiceType(service._id, {
          name: name.trim(),
          durationMin: parseFloat(duration),
          pricePerSession: parseFloat(price),
          note: note.trim() || null,
          isActive,
        });
        updateItem(updated);
      } else {
        const created = await createServiceType({
          name: name.trim(),
          durationMin: parseFloat(duration),
          pricePerSession: parseFloat(price),
          note: note.trim() || undefined,
        });
        addItem(created);
      }
      handleClose();
    } catch {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  const title = isEdit ? 'Edit Service' : 'Add Service';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View
          className="rounded-t-2xl bg-card"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Sheet header */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-foreground/[.06]">
            <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
              {title}
            </Text>
            <Pressable
              testID="service-sheet-cancel"
              onPress={handleClose}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text className="text-sm text-foreground/65">Cancel</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="px-4 py-4 gap-4">
              {/* Name */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Name <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="service-name-input"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. PT Session"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                  autoCapitalize="words"
                  accessibilityLabel="Service name"
                />
              </View>

              {/* Duration */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Duration <Text className="text-foreground/65">(min)</Text>{' '}
                  <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="service-duration-input"
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="60"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="decimal-pad"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                  accessibilityLabel="Duration in minutes"
                />
              </View>

              {/* Price per session */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Price per session <Text className="text-foreground/65">(AUD)</Text>{' '}
                  <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="service-price-input"
                  value={price}
                  onChangeText={setPrice}
                  placeholder="80"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="decimal-pad"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                  accessibilityLabel="Price per session"
                />
              </View>

              {/* Note */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Note <Text className="text-foreground/65">(optional)</Text>
                </Text>
                <TextInput
                  testID="service-note-input"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Additional details..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                  multiline
                  accessibilityLabel="Note"
                />
              </View>

              {/* Active toggle — Edit mode only */}
              {isEdit && (
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 gap-0.5">
                    <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                      Active
                    </Text>
                    <Text className="text-xs text-foreground/65">
                      Inactive services are hidden from booking
                    </Text>
                  </View>
                  <Switch
                    testID="service-active-toggle"
                    value={isActive}
                    onValueChange={setIsActive}
                    accessibilityLabel="Active"
                    accessibilityRole="switch"
                  />
                </View>
              )}

              {/* Feedback */}
              {errorMsg ? (
                <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
              ) : null}
            </View>
          </ScrollView>

          {/* Footer action bar */}
          <View className="px-4 py-3 border-t border-foreground/10 bg-background/95">
            <Pressable
              testID="service-save-button"
              onPress={handleSave}
              disabled={!canSave || isSaving}
              accessibilityLabel="Save service"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave || isSaving }}
              className={`py-3 rounded-xl items-center ${
                canSave && !isSaving ? 'bg-primary' : 'bg-primary/40'
              }`}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.white} />
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

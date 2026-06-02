import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EquipmentItem, EquipmentStatus, UpdateEquipmentDto } from '../../../types/equipment';
import { EquipmentImagePicker } from './EquipmentImagePicker';
import { pickAndUploadImage } from '../../../lib/image-upload';

const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

const MAX_IMAGES = 5;

interface EquipmentDetailsTabProps {
  item: EquipmentItem;
  onSave(dto: UpdateEquipmentDto): Promise<void>;
  onDelete(): Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
  successMsg: string | null;
  errorMsg: string | null;
}

export function EquipmentDetailsTab({
  item,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
  successMsg,
  errorMsg,
}: EquipmentDetailsTabProps) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand ?? '');
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [status, setStatus] = useState<EquipmentStatus>(item.status);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [imageUrls, setImageUrls] = useState<string[]>(item.imageUrls ?? []);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: item.name,
        brand: item.brand ?? '',
        quantity: String(item.quantity),
        status: item.status,
        notes: item.notes ?? '',
        imageUrls: item.imageUrls ?? [],
      }),
    [item],
  );

  const isDirty = useMemo(
    () =>
      JSON.stringify({ name, brand, quantity, status, notes, imageUrls }) !== initialSnapshot,
    [name, brand, quantity, status, notes, imageUrls, initialSnapshot],
  );

  async function handleAddImage() {
    if (imageUrls.length >= MAX_IMAGES) return;
    setIsUploading(true);
    try {
      const url = await pickAndUploadImage();
      if (url) setImageUrls((prev) => [...prev, url]);
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function buildDto(): UpdateEquipmentDto {
    const qty = parseInt(quantity, 10);
    return {
      name: name.trim(),
      brand: brand.trim() || undefined,
      quantity: isNaN(qty) || qty < 1 ? 1 : qty,
      status,
      notes: notes.trim() || undefined,
      imageUrls,
    };
  }

  async function handleSave() {
    if (!isDirty || isSaving) return;
    await onSave(buildDto());
  }

  return (
    <>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-4">
          {/* Name */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Name <Text className="text-destructive">*</Text>
            </Text>
            <TextInput
              testID="equipment-detail-name-input"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Treadmill"
              placeholderTextColor="#616161"
              className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
              autoCapitalize="words"
            />
          </View>

          {/* Brand */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Brand <Text className="text-foreground/65">(optional)</Text>
            </Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g. Life Fitness"
              placeholderTextColor="#616161"
              className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </View>

          {/* Quantity */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Quantity
            </Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholderTextColor="#616161"
              className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </View>

          {/* Status */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Status
            </Text>
            <View className="flex-row gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setStatus(opt.value)}
                  accessibilityLabel={opt.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: status === opt.value }}
                  className={`flex-1 items-center py-2 rounded-xl border ${
                    status === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-foreground/10 bg-input'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      status === opt.value ? 'text-primary-light' : 'text-foreground/65'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Notes <Text className="text-foreground/65">(optional)</Text>
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes…"
              placeholderTextColor="#616161"
              multiline
              numberOfLines={3}
              className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </View>

          {/* Images */}
          <EquipmentImagePicker
            imageUrls={imageUrls}
            onAdd={handleAddImage}
            onRemove={handleRemoveImage}
            isUploading={isUploading}
          />

          {/* Feedback */}
          {successMsg ? (
            <Text className="text-sm text-emerald-300 text-center">{successMsg}</Text>
          ) : null}
          {errorMsg ? (
            <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Footer action bar */}
      <View
        className="border-t border-foreground/10 px-4 py-3 gap-2"
        style={{ paddingBottom: insets.bottom || 12 }}
      >
        <Pressable
          testID="equipment-detail-save"
          onPress={handleSave}
          disabled={!isDirty || isSaving}
          accessibilityLabel="Save changes"
          accessibilityRole="button"
          accessibilityState={{ disabled: !isDirty || isSaving }}
          className={`py-3 rounded-xl items-center ${
            isDirty && !isSaving ? 'bg-primary' : 'bg-primary/40'
          }`}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-foreground">Save Changes</Text>
          )}
        </Pressable>

        <Pressable
          testID="equipment-detail-delete"
          onPress={() => setDeleteDialogVisible(true)}
          accessibilityLabel="Delete equipment"
          accessibilityRole="button"
          className="py-2.5 rounded-xl items-center bg-destructive/10"
        >
          <Text className="text-sm font-medium text-destructive">Delete Equipment</Text>
        </Pressable>
      </View>

      {/* Delete confirmation dialog */}
      <Modal
        visible={deleteDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteDialogVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full rounded-2xl bg-card p-6">
            <Text className="text-[18px] font-semibold text-foreground mb-2">
              Delete Equipment
            </Text>
            <Text className="text-sm text-foreground/65 mb-6">
              This will permanently delete this equipment and all its condition reports. This action
              cannot be undone.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setDeleteDialogVisible(false)}
                accessibilityLabel="Cancel delete"
                accessibilityRole="button"
                className="flex-1 py-2.5 rounded-xl items-center bg-muted"
              >
                <Text className="text-sm font-medium text-foreground/65">Cancel</Text>
              </Pressable>
              <Pressable
                testID="equipment-delete-confirm"
                onPress={async () => {
                  setDeleteDialogVisible(false);
                  await onDelete();
                }}
                disabled={isDeleting}
                accessibilityLabel="Confirm delete"
                accessibilityRole="button"
                className="flex-1 py-2.5 rounded-xl items-center bg-destructive/10"
              >
                {isDeleting ? (
                  <ActivityIndicator color="#ef4444" />
                ) : (
                  <Text className="text-sm font-medium text-destructive">Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

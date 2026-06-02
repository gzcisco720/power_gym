import React, { useState } from 'react';
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
import { useEquipmentStore } from '../../stores/equipment.store';
import { createEquipment } from '../../lib/api/equipment.api';
import { searchCatalog } from '../../lib/equipment-catalog';
import { pickAndUploadImage } from '../../lib/image-upload';
import { EquipmentStatus } from '../../types/equipment';
import { EquipmentImagePicker } from './components/EquipmentImagePicker';

const MAX_IMAGES = 5;

interface AddEquipmentSheetProps {
  visible: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

export function AddEquipmentSheet({ visible, onClose }: AddEquipmentSheetProps) {
  const insets = useSafeAreaInsets();
  const addItem = useEquipmentStore((s) => s.addItem);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [status, setStatus] = useState<EquipmentStatus>('active');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trackCondition, setTrackCondition] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const canSave = name.trim().length > 0;

  function handleNameChange(text: string) {
    setName(text);
    setSuggestions(text.length >= 2 ? searchCatalog(text) : []);
  }

  function handleSuggestionPress(suggestion: string) {
    setName(suggestion);
    setSuggestions([]);
  }

  async function handleAddImage() {
    if (imageUrls.length >= MAX_IMAGES) {
      setErrorMsg(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }
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

  function handleClose() {
    setName('');
    setBrand('');
    setQuantity('1');
    setStatus('active');
    setTrackCondition(false);
    setSuggestions([]);
    setImageUrls([]);
    setSuccessMsg(null);
    setErrorMsg(null);
    onClose();
  }

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const qty = parseInt(quantity, 10);
      const item = await createEquipment({
        name: name.trim(),
        brand: brand.trim() || undefined,
        quantity: isNaN(qty) || qty < 1 ? 1 : qty,
        status,
        trackCondition,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
      addItem(item);
      setSuccessMsg('Equipment added');
    } catch {
      setErrorMsg('Failed to add equipment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View
          className="rounded-t-2xl bg-card"
          style={{ paddingBottom: insets.bottom || 16 }}
        >
          {/* Sheet header */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-foreground/[.06]">
            <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
              Add Equipment
            </Text>
            <Pressable
              onPress={handleClose}
              accessibilityLabel="Close add equipment"
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
                  testID="add-name-input"
                  value={name}
                  onChangeText={handleNameChange}
                  placeholder="e.g. Treadmill"
                  placeholderTextColor="#616161"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                  autoCapitalize="words"
                />
                {/* Catalog suggestions */}
                {suggestions.length > 0 ? (
                  <View className="rounded-xl bg-input overflow-hidden">
                    {suggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        testID={`catalog-suggestion-${suggestion}`}
                        onPress={() => handleSuggestionPress(suggestion)}
                        accessibilityLabel={suggestion}
                        accessibilityRole="button"
                        className="px-3 py-2 border-b border-foreground/[.06]"
                      >
                        <Text className="text-sm text-foreground">{suggestion}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
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

              {/* Track Condition */}
              <View className="flex-row items-center justify-between">
                <View className="flex-1 gap-0.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                    Track Condition
                  </Text>
                  <Text className="text-xs text-foreground/65">
                    Enable condition report logging
                  </Text>
                </View>
                <Switch
                  testID="add-track-condition-toggle"
                  value={trackCondition}
                  onValueChange={setTrackCondition}
                  accessibilityLabel="Track condition"
                  accessibilityRole="switch"
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
          <View className="px-4 py-3 border-t border-foreground/10">
            <Pressable
              testID="add-save-button"
              onPress={handleSave}
              disabled={!canSave || isSaving}
              accessibilityLabel="Save equipment"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave || isSaving }}
              className={`py-3 rounded-xl items-center ${
                canSave && !isSaving ? 'bg-primary' : 'bg-primary/40'
              }`}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
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

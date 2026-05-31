import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getGymInfo, updateGymInfo, uploadLogo, GymInfo, UpdateGymInfoDto } from '../../../lib/api/gym.api';

interface FormState {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  hours: string;
  description: string;
}

function toFormState(info: GymInfo): FormState {
  return {
    name: info.name ?? '',
    address: info.address ?? '',
    phone: info.phone ?? '',
    email: info.email ?? '',
    website: info.website ?? '',
    hours: info.hours ?? '',
    description: info.description ?? '',
  };
}

export function GymInfoTab() {
  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);
  const [form, setForm] = useState<FormState>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    hours: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getGymInfo()
      .then((info) => {
        setGymInfo(info);
        setForm(toFormState(info));
      })
      .catch(() => {
        // Non-fatal — keep empty form
      })
      .finally(() => setIsLoading(false));
  }, []);

  const initialSnapshot = useMemo(
    () => (gymInfo ? JSON.stringify(toFormState(gymInfo)) : null),
    [gymInfo],
  );

  const isDirty = useMemo(
    () => initialSnapshot !== null && JSON.stringify(form) !== initialSnapshot,
    [form, initialSnapshot],
  );

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  }

  async function handleLogoUpload(kind: 'sidebar' | 'login') {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await uploadLogo(result.assets[0].uri, kind);
      } catch {
        // Non-fatal
      }
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const dto: UpdateGymInfoDto = {
        name: form.name || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        hours: form.hours || undefined,
        description: form.description || undefined,
      };
      const updated = await updateGymInfo(dto);
      setGymInfo(updated);
      setForm(toFormState(updated));
      setSaveSuccess(true);
    } catch {
      setSaveError('Failed to save gym info. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled">
      <View className="px-4 py-6 gap-6">
        {/* Logo uploads */}
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Sidebar Logo
            </Text>
            <Pressable
              onPress={() => handleLogoUpload('sidebar')}
              accessibilityLabel="Upload sidebar logo"
              className="bg-input rounded-xl px-3 py-3 items-center"
            >
              <Text className="text-xs text-foreground/65">
                {gymInfo?.logoUrl ? 'Change Logo' : 'Upload Logo'}
              </Text>
            </Pressable>
          </View>
          <View className="flex-1 gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Login Logo
            </Text>
            <Pressable
              onPress={() => handleLogoUpload('login')}
              accessibilityLabel="Upload login logo"
              className="bg-input rounded-xl px-3 py-3 items-center"
            >
              <Text className="text-xs text-foreground/65">
                {gymInfo?.loginLogoUrl ? 'Change Logo' : 'Upload Logo'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Gym Name */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Gym Name
          </Text>
          <TextInput
            value={form.name}
            onChangeText={(v) => update('name', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="Your gym name"
          />
        </View>

        {/* Address */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Address
          </Text>
          <TextInput
            value={form.address}
            onChangeText={(v) => update('address', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="Street, City, State"
          />
        </View>

        {/* Phone */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Phone
          </Text>
          <TextInput
            value={form.phone}
            onChangeText={(v) => update('phone', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
        </View>

        {/* Email */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Email
          </Text>
          <TextInput
            value={form.email}
            onChangeText={(v) => update('email', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="contact@yourgym.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Website */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Website
          </Text>
          <TextInput
            value={form.website}
            onChangeText={(v) => update('website', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="https://yourgym.com"
            autoCapitalize="none"
          />
        </View>

        {/* Hours */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Hours
          </Text>
          <TextInput
            value={form.hours}
            onChangeText={(v) => update('hours', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="Mon–Fri 6am–10pm"
          />
        </View>

        {/* Description */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Description
          </Text>
          <TextInput
            value={form.description}
            onChangeText={(v) => update('description', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="Describe your gym"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Success/error */}
        {saveSuccess ? (
          <Text testID="gym-info-save-success" className="text-sm text-emerald-300 text-center">
            Gym info saved
          </Text>
        ) : null}
        {saveError ? (
          <Text className="text-xs text-destructive text-center">{saveError}</Text>
        ) : null}

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={!isDirty || isSaving}
          accessibilityLabel="Save Gym Info"
          accessibilityState={{ disabled: !isDirty || isSaving }}
          className={`py-3 rounded-xl items-center ${isDirty && !isSaving ? 'bg-primary' : 'bg-primary/40'}`}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-foreground">Save Gym Info</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

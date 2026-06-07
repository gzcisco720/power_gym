import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useProfileStore } from '../../../stores/profile.store';
import { validateProfile } from '../../../lib/validation/profile';
import { uploadAvatar, changeEmail, UpdateProfileDto, ProfileData } from '../../../lib/api/profile.api';

type UserRole = 'owner' | 'trainer' | 'member';

const SEX_OPTIONS = ['male', 'female'] as const;
const FITNESS_GOAL_OPTIONS = ['lose_fat', 'build_muscle', 'maintain', 'improve_performance'] as const;
const FITNESS_LEVEL_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;

const GOAL_LABELS: Record<string, string> = {
  lose_fat: 'Lose Fat',
  build_muscle: 'Build Muscle',
  maintain: 'Maintain',
  improve_performance: 'Improve Performance',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

interface Props {
  role: UserRole;
}

interface FormState {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  mobile: string;
  address: string;
  certifications: string;
  bio: string;
  specializations: string;
  sex: string;
  fitnessGoal: string;
  fitnessLevel: string;
}

function toFormState(profile: ProfileData): FormState {
  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    dateOfBirth: profile.dateOfBirth ?? '',
    mobile: profile.mobile ?? '',
    address: profile.address ?? '',
    certifications: profile.certifications?.join(', ') ?? '',
    bio: profile.bio ?? '',
    specializations: profile.specializations?.join(', ') ?? '',
    sex: profile.sex ?? '',
    fitnessGoal: profile.fitnessGoal ?? '',
    fitnessLevel: profile.fitnessLevel ?? '',
  };
}

export function ProfileTab({ role }: Props) {
  const { profile, fetchProfile, saveProfile } = useProfileStore();
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    mobile: '',
    address: '',
    certifications: '',
    bio: '',
    specializations: '',
    sex: '',
    fitnessGoal: '',
    fitnessLevel: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [emailEditing, setEmailEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, [profile, fetchProfile]);

  useEffect(() => {
    if (profile) {
      setForm(toFormState(profile));
    }
  }, [profile]);

  const initialSnapshot = useMemo(
    () => (profile ? JSON.stringify(toFormState(profile)) : null),
    [profile],
  );

  const isDirty = useMemo(
    () => initialSnapshot !== null && JSON.stringify(form) !== initialSnapshot,
    [form, initialSnapshot],
  );

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  }

  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await uploadAvatar(result.assets[0].uri);
        await fetchProfile();
      } catch {
        // Non-fatal
      }
    }
  }

  async function handleSave() {
    const profileErrors = validateProfile(
      { firstName: form.firstName, lastName: form.lastName },
      role,
    );
    if (Object.keys(profileErrors).length > 0) {
      setErrors(profileErrors);
      return;
    }
    setErrors({});
    setIsSaving(true);
    setSaveError(null);
    try {
      const dto: UpdateProfileDto = {
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth || undefined,
        mobile: form.mobile || undefined,
        address: form.address || undefined,
      };

      if (role === 'owner' || role === 'trainer') {
        dto.certifications = form.certifications
          ? form.certifications.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      }
      if (role === 'trainer') {
        dto.bio = form.bio || undefined;
        dto.specializations = form.specializations
          ? form.specializations.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      }
      if (role === 'member') {
        if (form.sex) dto.sex = form.sex as 'male' | 'female';
        if (form.fitnessGoal) dto.fitnessGoal = form.fitnessGoal as UpdateProfileDto['fitnessGoal'];
        if (form.fitnessLevel) dto.fitnessLevel = form.fitnessLevel as UpdateProfileDto['fitnessLevel'];
      }

      await saveProfile(dto);
      setSaveSuccess(true);
    } catch {
      setSaveError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled">
      <View className="px-4 py-6 gap-6">
        {/* Avatar */}
        <View className="items-center gap-3">
          <Pressable
            onPress={handlePickAvatar}
            accessibilityLabel="Upload profile photo"
            className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center"
          >
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-primary-light">
              {profile?.avatarUrl ? 'Change' : 'Upload'}
            </Text>
          </Pressable>
          <Text className="text-xs text-foreground/65">JPG, PNG or WebP, max 5MB</Text>
        </View>

        {/* First Name */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            First Name <Text className="text-destructive">*</Text>
          </Text>
          <TextInput
            value={form.firstName}
            onChangeText={(v) => update('firstName', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="First name"
          />
          {errors.firstName ? (
            <Text className="text-xs text-destructive">{errors.firstName}</Text>
          ) : null}
        </View>

        {/* Last Name */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Last Name <Text className="text-destructive">*</Text>
          </Text>
          <TextInput
            value={form.lastName}
            onChangeText={(v) => update('lastName', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="Last name"
          />
          {errors.lastName ? (
            <Text className="text-xs text-destructive">{errors.lastName}</Text>
          ) : null}
        </View>

        {/* Email */}
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Email
            </Text>
            {!emailEditing && (
              <Pressable
                testID="email-change-button"
                onPress={() => { setEmailEditing(true); setEmailError(null); setEmailSuccess(false); setNewEmail(''); setEmailPassword(''); }}
                accessibilityLabel="Change email"
                accessibilityRole="button"
              >
                <Text className="text-xs text-primary-light">Change</Text>
              </Pressable>
            )}
          </View>
          {emailEditing ? (
            <View className="gap-2">
              <TextInput
                testID="email-new-input"
                value={newEmail}
                onChangeText={setNewEmail}
                className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                placeholderTextColor="#616161"
                placeholder="New email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                testID="email-password-input"
                value={emailPassword}
                onChangeText={setEmailPassword}
                className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
                placeholderTextColor="#616161"
                placeholder="Current password"
                secureTextEntry
              />
              {emailError ? (
                <Text className="text-xs text-destructive">{emailError}</Text>
              ) : null}
              {emailSuccess ? (
                <Text testID="email-change-success" className="text-xs text-emerald-300">Email updated successfully</Text>
              ) : null}
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setEmailEditing(false)}
                  accessibilityLabel="Cancel email change"
                  className="flex-1 py-2 rounded-xl bg-muted items-center"
                >
                  <Text className="text-sm text-foreground/65">Cancel</Text>
                </Pressable>
                <Pressable
                  testID="email-save-button"
                  onPress={async () => {
                    if (!newEmail.includes('@')) { setEmailError('Enter a valid email'); return; }
                    if (!emailPassword) { setEmailError('Enter your current password'); return; }
                    setEmailSaving(true); setEmailError(null);
                    try {
                      await changeEmail(newEmail, emailPassword);
                      await fetchProfile();
                      setEmailSuccess(true);
                      setEmailEditing(false);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : '';
                      if (msg.includes('409') || msg.includes('Conflict')) {
                        setEmailError('Email already in use');
                      } else if (msg.includes('400') || msg.includes('password')) {
                        setEmailError('Current password is incorrect');
                      } else {
                        setEmailError('Failed to update email');
                      }
                    } finally {
                      setEmailSaving(false);
                    }
                  }}
                  disabled={emailSaving}
                  accessibilityLabel="Save new email"
                  className={`flex-1 py-2 rounded-xl items-center ${emailSaving ? 'bg-primary/40' : 'bg-primary'}`}
                >
                  <Text className="text-sm font-semibold text-foreground">{emailSaving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text className="text-sm text-foreground/65 px-3 py-2">
              {profile?.email ?? '—'}
            </Text>
          )}
        </View>

        {/* Date of Birth */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Date of Birth <Text className="text-foreground/40">(optional)</Text>
          </Text>
          <TextInput
            value={form.dateOfBirth}
            onChangeText={(v) => update('dateOfBirth', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* Mobile */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Mobile <Text className="text-foreground/40">(optional)</Text>
          </Text>
          <TextInput
            value={form.mobile}
            onChangeText={(v) => update('mobile', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
        </View>

        {/* Address */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Address <Text className="text-foreground/40">(optional)</Text>
          </Text>
          <TextInput
            value={form.address}
            onChangeText={(v) => update('address', v)}
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="Street, City, State"
          />
        </View>

        {/* Trainer-only: Bio */}
        {role === 'trainer' ? (
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Bio <Text className="text-foreground/40">(optional)</Text>
            </Text>
            <TextInput
              value={form.bio}
              onChangeText={(v) => update('bio', v)}
              className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
              placeholderTextColor="#616161"
              placeholder="Tell members about yourself"
              multiline
              numberOfLines={3}
            />
          </View>
        ) : null}

        {/* Trainer-only: Specializations */}
        {role === 'trainer' ? (
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Specializations <Text className="text-foreground/40">(optional)</Text>
            </Text>
            <TextInput
              value={form.specializations}
              onChangeText={(v) => update('specializations', v)}
              className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
              placeholderTextColor="#616161"
              placeholder="e.g. Strength, HIIT, Yoga"
            />
          </View>
        ) : null}

        {/* Owner + Trainer: Certifications */}
        {role === 'owner' || role === 'trainer' ? (
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Certifications <Text className="text-foreground/40">(optional)</Text>
            </Text>
            <TextInput
              value={form.certifications}
              onChangeText={(v) => update('certifications', v)}
              className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
              placeholderTextColor="#616161"
              placeholder="e.g. ACE, NASM, CSCS"
            />
          </View>
        ) : null}

        {/* Member-only: Sex */}
        {role === 'member' ? (
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Sex <Text className="text-foreground/40">(optional)</Text>
            </Text>
            <View className="flex-row gap-2">
              {SEX_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => update('sex', form.sex === opt ? '' : opt)}
                  accessibilityLabel={opt}
                  className={`px-3 py-2 rounded-xl border ${form.sex === opt ? 'bg-primary/20 border-primary/40' : 'bg-input border-transparent'}`}
                >
                  <Text className={`text-sm ${form.sex === opt ? 'text-primary-light' : 'text-foreground/65'}`}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Member-only: Fitness Goal */}
        {role === 'member' ? (
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Fitness Goal <Text className="text-foreground/40">(optional)</Text>
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {FITNESS_GOAL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => update('fitnessGoal', form.fitnessGoal === opt ? '' : opt)}
                  accessibilityLabel={GOAL_LABELS[opt]}
                  className={`px-3 py-2 rounded-xl border ${form.fitnessGoal === opt ? 'bg-primary/20 border-primary/40' : 'bg-input border-transparent'}`}
                >
                  <Text className={`text-sm ${form.fitnessGoal === opt ? 'text-primary-light' : 'text-foreground/65'}`}>
                    {GOAL_LABELS[opt]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Member-only: Fitness Level */}
        {role === 'member' ? (
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Fitness Level <Text className="text-foreground/40">(optional)</Text>
            </Text>
            <View className="flex-row gap-2">
              {FITNESS_LEVEL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => update('fitnessLevel', form.fitnessLevel === opt ? '' : opt)}
                  accessibilityLabel={LEVEL_LABELS[opt]}
                  className={`px-3 py-2 rounded-xl border ${form.fitnessLevel === opt ? 'bg-primary/20 border-primary/40' : 'bg-input border-transparent'}`}
                >
                  <Text className={`text-sm ${form.fitnessLevel === opt ? 'text-primary-light' : 'text-foreground/65'}`}>
                    {LEVEL_LABELS[opt]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Success/error feedback */}
        {saveSuccess ? (
          <Text testID="settings-save-success" className="text-sm text-emerald-300 text-center">
            Profile saved successfully
          </Text>
        ) : null}
        {saveError ? (
          <Text className="text-xs text-destructive text-center">{saveError}</Text>
        ) : null}

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={!isDirty || isSaving}
          accessibilityLabel="Save Profile"
          accessibilityState={{ disabled: !isDirty || isSaving }}
          className={`py-3 rounded-xl items-center ${isDirty && !isSaving ? 'bg-primary' : 'bg-primary/40'}`}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-foreground">Save Profile</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useProfileStore } from '../../../stores/profile.store';
import { validatePassword } from '../../../lib/validation/profile';

export function SecurityTab() {
  const { changePassword } = useProfileStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit() {
    const validationErrors = validatePassword({ currentPassword, newPassword, confirmPassword });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    setServerError(null);
    setSuccess(false);

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 400) {
        setServerError('Current password is incorrect');
      } else {
        setServerError('Failed to update password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled">
      <View className="px-4 py-6 gap-6">
        {/* Current Password */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Current Password
          </Text>
          <TextInput
            value={currentPassword}
            onChangeText={(v) => {
              setCurrentPassword(v);
              setSuccess(false);
              setServerError(null);
            }}
            secureTextEntry
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="••••••••"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.currentPassword ? (
            <Text className="text-xs text-destructive">{errors.currentPassword}</Text>
          ) : null}
        </View>

        {/* New Password */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            New Password
          </Text>
          <TextInput
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              setSuccess(false);
            }}
            secureTextEntry
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.newPassword ? (
            <Text className="text-xs text-destructive">{errors.newPassword}</Text>
          ) : null}
        </View>

        {/* Confirm New Password */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Confirm New Password
          </Text>
          <TextInput
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setSuccess(false);
            }}
            secureTextEntry
            className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
            placeholderTextColor="#616161"
            placeholder="Repeat new password"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.confirmPassword ? (
            <Text className="text-xs text-destructive">{errors.confirmPassword}</Text>
          ) : null}
        </View>

        {/* Server error */}
        {serverError ? (
          <Text testID="security-server-error" className="text-xs text-destructive text-center">
            {serverError}
          </Text>
        ) : null}

        {/* Success message */}
        {success ? (
          <Text testID="security-success" className="text-sm text-emerald-300 text-center">
            Password updated successfully
          </Text>
        ) : null}

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityLabel="Update Password"
          accessibilityState={{ disabled: isSubmitting }}
          className={`py-3 rounded-xl items-center ${!isSubmitting ? 'bg-primary' : 'bg-primary/40'}`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-foreground">Update Password</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

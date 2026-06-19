import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useProfileStore } from '../../../stores/profile.store';
import { useAuthStore } from '../../../stores/auth.store';
import { validatePassword } from '../../../lib/validation/profile';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';

export function SecurityTab() {
  const { changePassword } = useProfileStore();
  const biometricsEnabled = useAuthStore((s) => s.biometricsEnabled);
  const setBiometricsEnabled = useAuthStore((s) => s.setBiometricsEnabled);
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
        {/* Biometric login toggle */}
        <View className="flex-row items-center justify-between px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10">
          <Text className="text-sm text-foreground">Biometric Login</Text>
          <Switch
            testID="security-biometric-switch"
            checked={biometricsEnabled}
            onCheckedChange={(enabled) => void setBiometricsEnabled(enabled)}
            accessibilityLabel="Toggle biometric login"
          />
        </View>

        {/* Current Password */}
        <View className="gap-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Current Password
          </Text>
          <Input
            value={currentPassword}
            onChangeText={(v) => {
              setCurrentPassword(v);
              setSuccess(false);
              setServerError(null);
            }}
            secureTextEntry
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
          <Input
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              setSuccess(false);
            }}
            secureTextEntry
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
          <Input
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setSuccess(false);
            }}
            secureTextEntry
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
        <Button
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityLabel="Update Password"
        >
          <Text className="text-sm font-semibold text-foreground">Update Password</Text>
        </Button>
      </View>
    </ScrollView>
  );
}

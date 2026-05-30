import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiClient } from '../lib/api/client';
import { colors } from '../lib/theme';

interface ResetPasswordRouteParams {
  token: string;
}

export function ResetPasswordScreen() {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const route = useRoute<{ key: string; name: string; params: ResetPasswordRouteParams }>();
  const token = route.params?.token ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isTokenError, setIsTokenError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsTokenError(false);
      return;
    }
    setError('');
    setIsTokenError(false);
    setIsLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword });
      navigation.navigate('Login');
    } catch {
      setError('This reset link is invalid or has expired.');
      setIsTokenError(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-6 pt-12">
      <Text className="mb-2 text-[18px] font-semibold tracking-[-0.3px] text-foreground">
        Set New Password
      </Text>
      <Text className="mb-8 text-[13px] text-foreground/65">
        Enter your new password below.
      </Text>

      <View className="mb-4 gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          New Password
        </Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          placeholderTextColor={colors.placeholderText}
          secureTextEntry
          accessibilityLabel="New Password"
          className="h-12 rounded-xl border border-border bg-input px-4 text-[14px] text-foreground"
        />
      </View>

      <View className="mb-4 gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Confirm Password
        </Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor={colors.placeholderText}
          secureTextEntry
          accessibilityLabel="Confirm Password"
          className="h-12 rounded-xl border border-border bg-input px-4 text-[14px] text-foreground"
        />
      </View>

      {error ? (
        <View className="mb-4">
          <Text className="text-[13px] text-destructive">{error}</Text>
          {isTokenError ? (
            <Pressable
              accessibilityLabel="Request a new reset link"
              accessibilityRole="button"
              onPress={() => navigation.navigate('ForgotPassword')}
              className="mt-1"
            >
              <Text className="text-[13px] text-primary">Request a new link</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Reset Password"
        accessibilityRole="button"
        onPress={handleSubmit}
        disabled={isLoading}
        className="h-12 items-center justify-center rounded-xl bg-white"
      >
        <Text className="text-[15px] font-semibold text-black">Reset Password</Text>
      </Pressable>
    </View>
  );
}

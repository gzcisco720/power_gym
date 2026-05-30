import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '../lib/api/client';
import { colors } from '../lib/theme';

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!email) return;
    setIsLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch {
      // Server returns 200/201 regardless — don't leak email existence
    } finally {
      setSubmitted(true);
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text testID="forgot-password-success-message" className="text-[18px] font-semibold text-foreground">Check your email</Text>
        <Text className="mt-2 text-center text-[13px] text-foreground/65">
          If an account exists for {email}, you will receive a password reset link.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-6 pt-12">
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        className="mb-8 py-3"
      >
        <Text className="text-[14px] text-foreground/65">Back</Text>
      </Pressable>

      <Text className="mb-2 text-[18px] font-semibold tracking-[-0.3px] text-foreground">
        Forgot Password
      </Text>
      <Text className="mb-8 text-[13px] text-foreground/65">
        Enter your email and we will send you a reset link.
      </Text>

      <View className="mb-4 gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Email
        </Text>
        <TextInput
          testID="forgot-password-email-input"
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={colors.placeholderText}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Email"
          className="h-12 rounded-xl border border-border bg-input px-4 text-[14px] text-foreground"
        />
      </View>

      <Pressable
        testID="forgot-password-submit-button"
        accessibilityLabel="Send Reset Link"
        accessibilityRole="button"
        onPress={handleSubmit}
        disabled={isLoading || !email}
        className="h-12 items-center justify-center rounded-xl bg-white"
      >
        <Text className="text-[15px] font-semibold text-black">Send Reset Link</Text>
      </Pressable>
    </View>
  );
}

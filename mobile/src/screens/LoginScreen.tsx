import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/auth.store';
import { FaceIdIcon } from '../components/FaceIdIcon';
import { BiometricsPrompt } from '../components/BiometricsPrompt';
import { colors } from '../lib/theme';

export function LoginScreen() {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { login, loginWithBiometrics, biometricsEnabled, setBiometricsEnabled } =
    useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBiometricsPrompt, setShowBiometricsPrompt] = useState(false);

  async function handleSignIn() {
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      setShowBiometricsPrompt(true);
    } catch (err) {
      const axiosError = err as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        setError('Invalid email or password');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBiometricSignIn() {
    setError('');
    try {
      await loginWithBiometrics();
    } catch {
      setError('Biometric authentication failed. Please sign in with your password.');
    }
  }

  return (
    <View className="flex-1 bg-background px-6 pt-20">
      <View className="mb-12 items-center">
        <Text className="text-[9px] font-bold uppercase tracking-[5px] text-foreground">
          POWER GYM
        </Text>
      </View>

      <Text className="mb-8 text-[18px] font-semibold tracking-[-0.3px] text-foreground">
        Sign in
      </Text>

      <View className="mb-4 gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Email
        </Text>
        <TextInput
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

      <View className="mb-2 gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Password
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.placeholderText}
          secureTextEntry
          accessibilityLabel="Password"
          className="h-12 rounded-xl border border-border bg-input px-4 text-[14px] text-foreground"
        />
      </View>

      <Pressable
        accessibilityLabel="Forgot password"
        accessibilityRole="button"
        onPress={() => navigation.navigate('ForgotPassword')}
        className="mb-6 self-end"
      >
        <Text className="text-[13px] text-foreground/65">Forgot password?</Text>
      </Pressable>

      {error ? (
        <Text className="mb-4 text-[13px] text-destructive">{error}</Text>
      ) : null}

      <Pressable
        accessibilityLabel="Sign In"
        accessibilityRole="button"
        onPress={handleSignIn}
        disabled={isLoading}
        className="mb-3 h-12 items-center justify-center rounded-xl bg-white"
      >
        <Text className="text-[15px] font-semibold text-black">Sign In</Text>
      </Pressable>

      {biometricsEnabled ? (
        <>
          <View className="my-1 flex-row items-center gap-2">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-[11px] text-foreground/40">or</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <Pressable
            accessibilityLabel="Sign in with Face ID"
            accessibilityRole="button"
            onPress={handleBiometricSignIn}
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-muted"
          >
            <FaceIdIcon size={20} />
            <Text className="text-[15px] font-medium text-foreground">
              Sign in with Face ID
            </Text>
          </Pressable>
        </>
      ) : null}

      <BiometricsPrompt
        visible={showBiometricsPrompt}
        onDismiss={() => setShowBiometricsPrompt(false)}
        setBiometricsEnabled={setBiometricsEnabled}
      />
    </View>
  );
}

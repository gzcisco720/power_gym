import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FaceIdIcon } from './FaceIdIcon';

interface BiometricsPromptProps {
  visible: boolean;
  onDismiss: () => void;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
}

export function BiometricsPrompt({
  visible,
  onDismiss,
  setBiometricsEnabled,
}: BiometricsPromptProps) {
  if (!visible) return null;

  async function handleEnable() {
    await setBiometricsEnabled(true);
    onDismiss();
  }

  function handleSkip() {
    onDismiss();
  }

  return (
    <View style={StyleSheet.absoluteFill} className="z-50 items-center justify-center bg-black/60 px-6">
      <View className="w-full rounded-2xl bg-card px-6 pb-6 pt-6">
        <View className="mb-4 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FaceIdIcon size={32} />
          </View>
          <Text className="text-[18px] font-semibold text-foreground">Enable Face ID?</Text>
          <Text className="mt-1 text-center text-[13px] text-foreground/65">
            Use Face ID to sign in faster next time.
          </Text>
        </View>

        <Pressable
          testID="biometrics-enable-button"
          accessibilityLabel="Enable Face ID"
          accessibilityRole="button"
          onPress={handleEnable}
          className="mb-3 h-12 items-center justify-center rounded-xl bg-white"
        >
          <Text className="text-[15px] font-semibold text-black">Enable Face ID</Text>
        </Pressable>

        <Pressable
          testID="biometrics-skip-button"
          accessibilityLabel="Skip Face ID setup"
          accessibilityRole="button"
          onPress={handleSkip}
          className="h-12 items-center justify-center"
        >
          <Text className="text-[15px] text-foreground/65">Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
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
  async function handleEnable() {
    await setBiometricsEnabled(true);
    onDismiss();
  }

  function handleSkip() {
    onDismiss();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleSkip}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-3xl bg-card px-6 pb-10 pt-6">
          <View className="mb-4 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <FaceIdIcon size={32} color="#ffffff" />
            </View>
            <Text className="text-[18px] font-semibold text-foreground">
              Enable Face ID
            </Text>
            <Text className="mt-1 text-center text-[13px] text-foreground/65">
              Sign in faster next time with Face ID instead of your password.
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Enable Face ID"
            onPress={handleEnable}
            className="mb-3 h-12 items-center justify-center rounded-xl bg-white"
          >
            <Text className="text-[15px] font-semibold text-black">Enable</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Skip Face ID setup"
            onPress={handleSkip}
            className="h-12 items-center justify-center"
          >
            <Text className="text-[15px] text-foreground/65">Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

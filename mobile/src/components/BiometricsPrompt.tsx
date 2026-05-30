import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Dialog } from './ui/Dialog';
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
    <Dialog.Root open={visible} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <Dialog.Overlay>
        <Dialog.Content>
          <View className="mb-4 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <FaceIdIcon size={32} />
            </View>
            <Dialog.Title className="text-[18px] font-semibold text-foreground">
              Enable Face ID?
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-center text-[13px] text-foreground/65">
              Use Face ID to sign in faster next time.
            </Dialog.Description>
          </View>

          <Pressable
            accessibilityLabel="Enable Face ID"
            accessibilityRole="button"
            onPress={handleEnable}
            className="mb-3 h-12 items-center justify-center rounded-xl bg-white"
          >
            <Text className="text-[15px] font-semibold text-black">Enable Face ID</Text>
          </Pressable>

          <Dialog.Close asChild>
            <Pressable
              accessibilityLabel="Skip Face ID setup"
              accessibilityRole="button"
              onPress={handleSkip}
              className="h-12 items-center justify-center"
            >
              <Text className="text-[15px] text-foreground/65">Skip</Text>
            </Pressable>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
}

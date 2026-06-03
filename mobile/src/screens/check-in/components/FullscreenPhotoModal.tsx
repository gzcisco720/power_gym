import React from 'react';
import { Image, Modal, Pressable } from 'react-native';

interface FullscreenPhotoModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

export function FullscreenPhotoModal({ visible, imageUri, onClose }: FullscreenPhotoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/90 items-center justify-center"
        onPress={onClose}
        accessibilityLabel="Close fullscreen photo"
        accessibilityRole="button"
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="w-full h-96"
            resizeMode="contain"
            accessibilityLabel="Full screen check-in photo"
          />
        ) : null}
      </Pressable>
    </Modal>
  );
}

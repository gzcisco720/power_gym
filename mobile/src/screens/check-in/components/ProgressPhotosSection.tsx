import React, { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { FullscreenPhotoModal } from './FullscreenPhotoModal';

interface ProgressPhotosSectionProps {
  photos: string[];
}

export function ProgressPhotosSection({ photos }: ProgressPhotosSectionProps) {
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);

  return (
    <View className="gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Progress Photos
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {photos.map((uri, i) => (
          <Pressable
            key={uri}
            testID={`progress-photo-${i}`}
            onPress={() => setFullscreenUri(uri)}
            accessibilityLabel={`View progress photo ${i + 1}`}
            accessibilityRole="button"
          >
            <Image
              source={{ uri }}
              className="w-24 h-24 rounded-xl"
              resizeMode="cover"
              accessibilityLabel={`Progress photo ${i + 1}`}
            />
          </Pressable>
        ))}
      </View>

      <FullscreenPhotoModal
        visible={fullscreenUri !== null}
        imageUri={fullscreenUri}
        onClose={() => setFullscreenUri(null)}
      />
    </View>
  );
}

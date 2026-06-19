import React, { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { pickAndUploadCheckInImage } from '../../../lib/check-in-image-upload';
import { FullscreenPhotoModal } from './FullscreenPhotoModal';

const MAX_PHOTOS = 5;

interface PhotosSectionProps {
  photos: string[];
  onChange(photos: string[]): void;
}

export function PhotosSection({ photos, onChange }: PhotosSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);

  async function handleAdd() {
    if (photos.length >= MAX_PHOTOS) {
      setError('Maximum 5 photos allowed');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadCheckInImage();
      if (url) onChange([...photos, url]);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <View className="gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
        Photos <Text className="text-foreground/65">(optional, max 5)</Text>
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {photos.map((uri, i) => (
            <View key={uri} className="relative">
              <Pressable
                onPress={() => setFullscreenUri(uri)}
                accessibilityLabel={`View photo ${i + 1}`}
                accessibilityRole="button"
              >
                <Image
                  source={{ uri }}
                  className="w-14 h-14 rounded-lg"
                  accessibilityLabel="Check-in photo"
                />
              </Pressable>
              <Pressable
                onPress={() => handleRemove(i)}
                accessibilityLabel={`Remove photo ${i + 1}`}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="absolute -top-1 -right-1 bg-destructive rounded-full w-5 h-5 items-center justify-center"
              >
                <Text className="text-xs text-foreground font-bold">×</Text>
              </Pressable>
            </View>
          ))}

          {photos.length < MAX_PHOTOS && (
            <Pressable
              onPress={() => void handleAdd()}
              disabled={uploading}
              accessibilityLabel="Add photo"
              accessibilityRole="button"
              className={`w-14 h-14 rounded-lg bg-input border border-foreground/10 items-center justify-center ${uploading ? 'opacity-50' : ''}`}
            >
              <Text className="text-xl text-foreground/65">{uploading ? '…' : '+'}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}

      <FullscreenPhotoModal
        visible={fullscreenUri !== null}
        imageUri={fullscreenUri}
        onClose={() => setFullscreenUri(null)}
      />
    </View>
  );
}

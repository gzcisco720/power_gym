import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Skeleton } from '~/components/ui/skeleton';

const MAX_IMAGES = 5;

interface EquipmentImagePickerProps {
  imageUrls: string[];
  onAdd: () => Promise<void>;
  onRemove: (index: number) => void;
  isUploading?: boolean;
}

export function EquipmentImagePicker({
  imageUrls,
  onAdd,
  onRemove,
  isUploading = false,
}: EquipmentImagePickerProps) {
  const canAdd = imageUrls.length < MAX_IMAGES;

  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
        Images <Text className="text-foreground/65">(optional)</Text>
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {imageUrls.map((url, index) => (
          <View key={index} className="relative">
            <Image
              source={{ uri: url }}
              className="h-16 w-16 rounded-xl"
              accessibilityLabel={`Equipment image ${index + 1}`}
            />
            <Pressable
              onPress={() => onRemove(index)}
              accessibilityLabel={`Remove image ${index + 1}`}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-destructive"
            >
              <Text className="text-xs text-foreground font-bold">×</Text>
            </Pressable>
          </View>
        ))}
        {canAdd ? (
          isUploading ? (
            <Skeleton className="h-16 w-16" />
          ) : (
            <Pressable
              onPress={onAdd}
              accessibilityLabel="Add image"
              accessibilityRole="button"
              className="h-16 w-16 items-center justify-center rounded-xl bg-input border border-foreground/10"
            >
              <Text className="text-2xl text-foreground/40">+</Text>
            </Pressable>
          )
        ) : null}
      </View>
      {imageUrls.length >= MAX_IMAGES ? (
        <Text className="text-xs text-foreground/65">Maximum {MAX_IMAGES} images reached.</Text>
      ) : null}
    </View>
  );
}

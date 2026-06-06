import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Modal,
} from 'react-native';
import { useMemberPhotosStore } from '../../../stores/member-photos.store';
import { MemberPhoto } from '../../../types/check-ins';

interface MemberPhotosTabProps {
  memberId: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function MemberPhotosTab({ memberId }: MemberPhotosTabProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<MemberPhoto | null>(null);

  const photos = useMemberPhotosStore((s) => s.photosByMember[memberId] ?? null);
  const loading = useMemberPhotosStore((s) => s.loadingByMember[memberId] ?? false);
  const fetchPhotos = useMemberPhotosStore((s) => s.fetchPhotos);

  useEffect(() => {
    void fetchPhotos(memberId);
  }, [fetchPhotos, memberId]);

  if (loading || photos === null) {
    return (
      <View className="px-4 py-4 gap-2">
        {[0, 1, 2].map((i) => (
          <View key={i} className="rounded-xl bg-muted h-24 opacity-60" />
        ))}
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text
          testID="photos-empty-state"
          className="text-[13px] text-foreground/65 text-center"
        >
          No photos yet.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4">
          <View className="flex-row flex-wrap gap-2">
            {photos.map((photo) => (
              <Pressable
                key={photo.key}
                testID={`photo-item-${photo.key}`}
                accessibilityLabel={`Photo from ${formatDate(photo.submittedAt)}`}
                accessibilityRole="button"
                onPress={() => setSelectedPhoto(photo)}
                className="w-[30%] aspect-square rounded-xl overflow-hidden bg-muted"
              >
                <Image
                  source={{ uri: photo.photoUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                  accessibilityLabel={`Check-in photo from ${formatDate(photo.submittedAt)}`}
                />
                <View className="absolute bottom-0 left-0 right-0 bg-background/70 px-1 py-0.5">
                  <Text className="text-[10px] text-foreground/65 text-center">
                    {formatDate(photo.submittedAt)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Photo context modal */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View
          testID="photo-modal"
          className="flex-1 bg-background/90 items-center justify-center px-4"
        >
          {selectedPhoto ? (
            <View className="w-full rounded-2xl bg-card ring-1 ring-foreground/10 overflow-hidden">
              <Image
                source={{ uri: selectedPhoto.photoUrl }}
                className="w-full aspect-square"
                resizeMode="cover"
                accessibilityLabel="Selected check-in photo"
              />
              <View className="px-4 py-3 gap-1.5">
                <Text className="text-sm font-medium text-foreground">
                  {formatDate(selectedPhoto.submittedAt)}
                </Text>
                {selectedPhoto.weight !== null ? (
                  <Text
                    testID="photo-modal-weight"
                    className="text-xs text-foreground/65"
                  >
                    {`Weight: ${selectedPhoto.weight} kg`}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel="Close photo"
                accessibilityRole="button"
                onPress={() => setSelectedPhoto(null)}
                className="mx-4 mb-4 rounded-xl bg-muted items-center py-2"
              >
                <Text className="text-sm font-medium text-foreground/65">Close</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

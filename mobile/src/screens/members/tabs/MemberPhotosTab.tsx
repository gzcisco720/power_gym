import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Modal,
} from 'react-native';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useMemberPhotosStore } from '../../../stores/member-photos.store';
import { MemberPhoto } from '../../../types/check-ins';

interface MemberPhotosTabProps {
  memberId: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export function MemberPhotosTab({ memberId }: MemberPhotosTabProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<MemberPhoto | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<MemberPhoto[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const photos = useMemberPhotosStore((s) => s.photosByMember[memberId] ?? null);
  const loading = useMemberPhotosStore((s) => s.loadingByMember[memberId] ?? false);
  const fetchPhotos = useMemberPhotosStore((s) => s.fetchPhotos);

  useEffect(() => {
    void fetchPhotos(memberId);
  }, [fetchPhotos, memberId]);

  function enterSelectMode() {
    setSelectMode(true);
    setSelected([]);
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected([]);
    setCompareOpen(false);
  }

  function toggleSelect(photo: MemberPhoto) {
    setSelected((prev) => {
      const idx = prev.findIndex((p) => p.key === photo.key);
      if (idx !== -1) return prev.filter((p) => p.key !== photo.key);
      if (prev.length >= 2) return prev;
      return [...prev, photo];
    });
  }

  function handlePhotoPress(photo: MemberPhoto) {
    if (selectMode) {
      toggleSelect(photo);
    } else {
      setSelectedPhoto(photo);
    }
  }

  const sortedSelected = [...selected].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );
  const compareLeft = sortedSelected[0];
  const compareRight = sortedSelected[1];

  if (loading || photos === null) {
    return (
      <View className="px-4 py-4 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
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
        <View className="px-4 py-4 gap-3">
          {/* Header row */}
          <View className="flex-row items-center justify-between">
            {selectMode ? (
              <>
                <Text className="text-xs text-primary-light font-medium">
                  {selected.length === 0
                    ? 'Tap to select photos'
                    : `${selected.length} of 2 selected`}
                </Text>
                <Button
                  testID="photos-cancel-button"
                  onPress={exitSelectMode}
                  accessibilityLabel="Cancel selection"
                  variant="ghost"
                  size="sm"
                >
                  <Text className="text-xs text-foreground/65">Cancel</Text>
                </Button>
              </>
            ) : (
              <>
                <Text className="text-xs text-foreground/40">{photos.length} photos</Text>
                {photos.length >= 2 && (
                  <Button
                    testID="photos-select-button"
                    onPress={enterSelectMode}
                    accessibilityLabel="Select photos to compare"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                  >
                    <Text className="text-xs font-semibold text-primary-light">Select</Text>
                  </Button>
                )}
              </>
            )}
          </View>

          {/* Photo grid */}
          <View className="flex-row flex-wrap gap-2">
            {photos.map((photo) => {
              const isSelected = selected.some((p) => p.key === photo.key);
              const badge = selected.findIndex((p) => p.key === photo.key) + 1;
              const isDimmed = selectMode && selected.length === 2 && !isSelected;

              return (
                <Pressable
                  key={photo.key}
                  testID={`photo-item-${photo.key}`}
                  accessibilityLabel={`Photo from ${formatDate(photo.submittedAt)}`}
                  accessibilityRole="button"
                  onPress={() => handlePhotoPress(photo)}
                  className={`w-[30%] aspect-square rounded-xl overflow-hidden bg-muted border-2 ${
                    isSelected ? 'border-primary' : 'border-transparent'
                  } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
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
                  {isSelected && (
                    <View className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-primary items-center justify-center">
                      <Text className="text-[10px] font-bold text-foreground">{badge}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Compare bar — shown when 2 selected */}
          {selectMode && selected.length === 2 && (
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2.5 flex-row items-center justify-between">
              <Text className="text-xs text-foreground/65">
                {compareLeft && formatShortDate(compareLeft.submittedAt)}
                {' · '}
                {compareRight && formatShortDate(compareRight.submittedAt)}
              </Text>
              <Button
                testID="photos-compare-button"
                onPress={() => setCompareOpen(true)}
                accessibilityLabel="Compare selected photos"
                size="sm"
                className="rounded-lg"
              >
                <Text className="text-xs font-semibold text-foreground">Compare Photos</Text>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Single photo modal */}
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
              <Button
                accessibilityLabel="Close photo"
                onPress={() => setSelectedPhoto(null)}
                variant="ghost"
                className="mx-4 mb-4 rounded-xl"
              >
                <Text className="text-sm font-medium text-foreground/65">Close</Text>
              </Button>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Compare modal */}
      <Modal
        visible={compareOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCompareOpen(false)}
      >
        <View
          testID="photos-compare-modal"
          className="flex-1 bg-background"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-foreground/[.06]">
            <Text className="text-sm font-semibold text-foreground">Photo Comparison</Text>
            <Button
              accessibilityLabel="Close comparison"
              onPress={() => setCompareOpen(false)}
              variant="ghost"
              size="sm"
              className="rounded-lg"
            >
              <Text className="text-xs text-foreground/65">Close</Text>
            </Button>
          </View>

          {/* Two-column comparison */}
          {compareLeft && compareRight && (
            <View className="flex-1 flex-row">
              {[compareLeft, compareRight].map((photo, i) => (
                <View key={photo.key} className="flex-1">
                  <View className="px-3 py-2 border-b border-foreground/[.06]">
                    <Text className={`text-[10px] font-semibold ${i === 0 ? 'text-primary-light' : 'text-emerald-400'}`}>
                      {i === 0 ? 'Before' : 'After'} · {formatShortDate(photo.submittedAt)}
                    </Text>
                    {photo.weight !== null && (
                      <Text className="text-[10px] text-foreground/40">{photo.weight} kg</Text>
                    )}
                  </View>
                  <Image
                    source={{ uri: photo.photoUrl }}
                    className="flex-1"
                    resizeMode="cover"
                    accessibilityLabel={`${i === 0 ? 'Before' : 'After'} photo`}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Weight delta */}
          {compareLeft?.weight !== null && compareRight?.weight !== null &&
            compareLeft !== undefined && compareRight !== undefined && (
            <View className="px-4 py-3 border-t border-foreground/[.06] flex-row items-center gap-3">
              {(() => {
                const delta = (compareRight.weight ?? 0) - (compareLeft.weight ?? 0);
                const isDown = delta < 0;
                return (
                  <Text className={`text-sm font-medium ${isDown ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isDown ? '▼' : '▲'} {Math.abs(delta).toFixed(1)} kg
                  </Text>
                );
              })()}
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

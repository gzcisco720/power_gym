import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Dialog } from '../../components/ui/Dialog';
import { useBodyTestsStore } from '../../stores/body-tests.store';
import { useAuthStore } from '../../stores/auth.store';
import { deleteBodyTest } from '../../lib/api/body-tests.api';
import { PROTOCOL_LABELS } from '../../types/body-tests';
import { AppStackParamList } from '../../navigation/index';

type DetailRouteProp = RouteProp<AppStackParamList, 'BodyTestDetail'>;

const SKINFOLD_LABELS: Record<string, string> = {
  tricep: 'Tricep',
  chest: 'Chest',
  subscapular: 'Subscapular',
  abdominal: 'Abdominal',
  suprailiac: 'Suprailiac',
  thigh: 'Thigh',
  midaxillary: 'Midaxillary',
  bicep: 'Bicep',
  lumbar: 'Lumbar',
};

const SKINFOLD_KEYS = [
  'tricep', 'chest', 'subscapular', 'abdominal',
  'suprailiac', 'thigh', 'midaxillary', 'bicep', 'lumbar',
] as const;

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BodyTestDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRouteProp>();
  const { bodyTest } = route.params ?? {};
  const removeItem = useBodyTestsStore((s) => s.removeItem);
  const role = useAuthStore((s) => s.user?.role);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!bodyTest) return null;

  const isOwner = role === 'owner';

  const presentSkinfolds = SKINFOLD_KEYS.filter(
    (key) => bodyTest[key as keyof typeof bodyTest] !== null,
  );

  const hasGoals =
    bodyTest.targetWeight !== null || bodyTest.targetBodyFatPct !== null;

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await deleteBodyTest(bodyTest._id);
      removeItem(bodyTest._id);
      setDeleteDialogVisible(false);
      navigation.goBack();
    } catch {
      setIsDeleting(false);
      setErrorMsg('Failed to delete. Please try again.');
    }
  }

  return (
    <Screen testID="screen-BodyTestDetail">
      <ScreenHeader
        title={formatDate(bodyTest.date)}
        onBack={() => navigation.goBack()}
        right={
          isOwner ? (
            <Pressable
              testID="bodytest-delete-button"
              onPress={() => setDeleteDialogVisible(true)}
              accessibilityLabel="Delete body test"
              accessibilityRole="button"
              className="ml-2 px-3 py-1.5 rounded-xl bg-destructive/10"
            >
              <Text className="text-sm font-semibold text-destructive">Delete</Text>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-6">
          {/* Results card */}
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Results
            </Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-[24px] font-semibold text-primary-light">
                {bodyTest.bodyFatPct.toFixed(1)}%
              </Text>
              <Text className="text-sm text-foreground/65"> body fat</Text>
            </View>
            <View className="flex-row gap-4">
              <View>
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Fat Mass
                </Text>
                <Text className="text-sm font-semibold text-foreground">
                  {bodyTest.fatMassKg.toFixed(1)} kg
                </Text>
              </View>
              <View>
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Lean Mass
                </Text>
                <Text className="text-sm font-semibold text-foreground">
                  {bodyTest.leanMassKg.toFixed(1)} kg
                </Text>
              </View>
              <View>
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Weight
                </Text>
                <Text className="text-sm font-semibold text-foreground">
                  {bodyTest.weight} kg
                </Text>
              </View>
            </View>
          </View>

          {/* Protocol */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Protocol
            </Text>
            <Text className="text-sm text-foreground">
              {PROTOCOL_LABELS[bodyTest.protocol]}
            </Text>
          </View>

          {/* Measurements grid */}
          {presentSkinfolds.length > 0 && (
            <View className="gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                Measurements
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {presentSkinfolds.map((key) => (
                  <View
                    key={key}
                    className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 min-w-[44%] flex-1"
                  >
                    <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                      {SKINFOLD_LABELS[key]}
                    </Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {String(bodyTest[key as keyof typeof bodyTest])} mm
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Goals */}
          {hasGoals && (
            <View className="gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                Goals
              </Text>
              <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 gap-2">
                {bodyTest.targetWeight !== null && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-foreground/65">Target Weight</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {bodyTest.targetWeight} kg
                    </Text>
                  </View>
                )}
                {bodyTest.targetBodyFatPct !== null && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-foreground/65">Target Body Fat</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {bodyTest.targetBodyFatPct}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {errorMsg ? (
            <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Delete confirmation dialog */}
      <Dialog.Root open={deleteDialogVisible} onOpenChange={setDeleteDialogVisible}>
        <Dialog.Overlay>
          <Dialog.Content>
            <Text className="text-[18px] font-semibold text-foreground mb-1">
              Delete this test?
            </Text>
            <Text className="text-sm text-foreground/65 mb-4">
              This cannot be undone.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setDeleteDialogVisible(false)}
                disabled={isDeleting}
                accessibilityLabel="Cancel delete"
                accessibilityRole="button"
                className="flex-1 py-3 rounded-xl bg-muted items-center"
              >
                <Text className="text-sm font-semibold text-foreground/65">Cancel</Text>
              </Pressable>
              <Pressable
                testID="bodytest-delete-confirm"
                onPress={handleDeleteConfirm}
                disabled={isDeleting}
                accessibilityLabel="Confirm delete"
                accessibilityRole="button"
                className="flex-1 py-3 rounded-xl bg-destructive/10 items-center"
              >
                {isDeleting ? (
                  <ActivityIndicator className="text-destructive" />
                ) : (
                  <Text className="text-sm font-semibold text-destructive">Delete</Text>
                )}
              </Pressable>
            </View>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Root>
    </Screen>
  );
}

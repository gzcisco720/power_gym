import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';

const RPE_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Somewhat Hard',
  5: 'Hard',
  6: 'Hard+',
  7: 'Very Hard',
  8: 'Very Very Hard',
  9: 'Extremely Hard',
  10: 'Max Effort',
};

interface RpeSheetProps {
  visible: boolean;
  onConfirm(rpe: number): void;
  onDismiss(): void;
}

export function RpeSheet({ visible, onConfirm, onDismiss }: RpeSheetProps) {
  const [selected, setSelected] = useState<number>(7);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <View className="flex-1 justify-end bg-black/60">
        <View
          testID="rpe-sheet"
          className="bg-card rounded-t-2xl px-4 pt-4 pb-8"
        >
          <Text className="text-[18px] font-semibold text-foreground text-center mb-1">
            Rate Your Effort
          </Text>
          <Text className="text-xs text-foreground/65 text-center mb-4">
            How hard was this workout? (RPE 1–10)
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const isSelected = selected === n;
                return (
                  <Pressable
                    key={n}
                    testID={`rpe-button-${n}`}
                    onPress={() => setSelected(n)}
                    accessibilityLabel={`RPE ${n}`}
                    accessibilityRole="button"
                    className={`w-12 h-12 rounded-xl items-center justify-center ${
                      isSelected ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected ? 'text-foreground' : 'text-foreground/65'
                      }`}
                    >
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text className="text-xs text-foreground/65 text-center mb-6">
            {RPE_LABELS[selected]}
          </Text>

          <Pressable
            testID="rpe-confirm-button"
            onPress={() => onConfirm(selected)}
            accessibilityLabel="Confirm RPE and finish workout"
            accessibilityRole="button"
            className="rounded-xl bg-primary items-center py-3 mb-3"
          >
            <Text className="text-sm font-semibold text-foreground">Finish Workout</Text>
          </Pressable>

          <Pressable
            testID="rpe-cancel-button"
            onPress={onDismiss}
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            className="items-center py-2"
          >
            <Text className="text-sm text-foreground/65">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTrainingStore } from '../../stores/training.store';
import { AppStackParamList } from '../../navigation/index';
import { SessionSet, PatchSetInput } from '../../types/training';
import { colors } from '../../lib/theme';

type SessionRouteProp = RouteProp<AppStackParamList, 'TrainerWorkoutSession'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

interface SetInputState {
  reps: string;
  weight: string;
}

// Group sets by exerciseId preserving order
function groupSets(sets: SessionSet[]): { exerciseName: string; sets: SessionSet[] }[] {
  const seen = new Map<string, { exerciseName: string; sets: SessionSet[] }>();
  for (const s of sets) {
    const existing = seen.get(s.exerciseId);
    if (existing) {
      existing.sets.push(s);
    } else {
      seen.set(s.exerciseId, { exerciseName: s.exerciseName, sets: [s] });
    }
  }
  return Array.from(seen.values());
}

export function TrainerWorkoutSessionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<SessionRouteProp>();
  const insets = useSafeAreaInsets();

  const { memberId, memberName } = route.params;

  const memberSession = useTrainingStore((s) => s.memberSession);
  const patchMemberSet = useTrainingStore((s) => s.patchMemberSet);
  const finishMemberSession = useTrainingStore((s) => s.finishMemberSession);

  const [inputs, setInputs] = useState<Record<string, SetInputState>>({});

  function getInput(exerciseId: string, setNumber: number): SetInputState {
    const key = `${exerciseId}-${setNumber}`;
    return inputs[key] ?? { reps: '', weight: '' };
  }

  function setInput(exerciseId: string, setNumber: number, patch: Partial<SetInputState>) {
    const key = `${exerciseId}-${setNumber}`;
    setInputs((prev) => ({ ...prev, [key]: { ...getInput(exerciseId, setNumber), ...patch } }));
  }

  const handleLogSet = useCallback(
    async (set: SessionSet) => {
      const { reps, weight } = getInput(set.exerciseId, set.setNumber);
      const input: PatchSetInput = {
        exerciseId: set.exerciseId,
        setNumber: set.setNumber,
        actualReps: parseInt(reps, 10) || 0,
        actualWeight: set.isBodyweight ? null : (parseFloat(weight) || null),
      };
      await patchMemberSet(memberId, input);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patchMemberSet, memberId, inputs],
  );

  const handleFinish = useCallback(async () => {
    await finishMemberSession(memberId);
    navigation.goBack();
  }, [finishMemberSession, memberId, navigation]);

  if (!memberSession) {
    return (
      <Screen testID="screen-TrainerWorkoutSession">
        <ScreenHeader title={memberName} onBack={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[13px] text-foreground/65">Session not found.</Text>
        </View>
      </Screen>
    );
  }

  const groups = groupSets(memberSession.sets);

  return (
    <Screen testID="screen-TrainerWorkoutSession">
      <ScreenHeader title={memberName} onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-6">
          {groups.map((group) => (
            <View key={group.sets[0].exerciseId} className="gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                {group.exerciseName}
              </Text>

              {group.sets.map((set) => {
                const input = getInput(set.exerciseId, set.setNumber);
                const isLogged = set.completedAt !== null;

                return (
                  <View
                    key={`${set.exerciseId}-${set.setNumber}`}
                    testID={`workout-set-${set.exerciseId}-${set.setNumber}`}
                    className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
                  >
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-xs text-foreground/65 w-8">
                        {`Set ${set.setNumber}`}
                      </Text>

                      <View className="flex-row items-center gap-2 flex-1">
                        {/* Reps input */}
                        <View className="flex-1">
                          <Text className="text-[10px] text-foreground/65 mb-0.5">
                            {`Reps (${set.prescribedRepsMin}–${set.prescribedRepsMax})`}
                          </Text>
                          <TextInput
                            testID={`set-reps-${set.exerciseId}-${set.setNumber}`}
                            value={input.reps}
                            onChangeText={(v) => setInput(set.exerciseId, set.setNumber, { reps: v })}
                            keyboardType="number-pad"
                            placeholder={`${set.prescribedRepsMin}`}
                            placeholderTextColor={colors.placeholderText}
                            editable={!isLogged}
                            className="bg-input rounded-lg px-2 py-1.5 text-sm text-foreground"
                          />
                        </View>

                        {/* Weight input (hidden for bodyweight) */}
                        {!set.isBodyweight ? (
                          <View className="flex-1">
                            <Text className="text-[10px] text-foreground/65 mb-0.5">
                              Weight (kg)
                            </Text>
                            <TextInput
                              testID={`set-weight-${set.exerciseId}-${set.setNumber}`}
                              value={input.weight}
                              onChangeText={(v) => setInput(set.exerciseId, set.setNumber, { weight: v })}
                              keyboardType="decimal-pad"
                              placeholder="0"
                              placeholderTextColor={colors.placeholderText}
                              editable={!isLogged}
                              className="bg-input rounded-lg px-2 py-1.5 text-sm text-foreground"
                            />
                          </View>
                        ) : null}
                      </View>

                      {/* Log / logged indicator */}
                      {isLogged ? (
                        <View
                          testID={`set-logged-${set.exerciseId}-${set.setNumber}`}
                          className="w-7 h-7 rounded-full bg-emerald-500/20 items-center justify-center"
                        >
                          <Text className="text-emerald-300 text-xs font-semibold">✓</Text>
                        </View>
                      ) : (
                        <Pressable
                          testID={`log-set-${set.exerciseId}-${set.setNumber}`}
                          onPress={() => void handleLogSet(set)}
                          accessibilityLabel={`Log set ${set.setNumber}`}
                          accessibilityRole="button"
                          className="rounded-lg bg-primary px-2.5 py-1.5"
                        >
                          <Text className="text-xs font-semibold text-foreground">Log</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky finish button */}
      <View
        className="border-t border-foreground/10 bg-background/95 px-4 py-3"
        style={{ paddingBottom: insets.bottom || 12 }}
      >
        <Pressable
          testID="finish-workout-button"
          onPress={() => void handleFinish()}
          accessibilityLabel="Finish workout"
          accessibilityRole="button"
          className="rounded-xl bg-primary items-center py-3"
        >
          <Text className="text-sm font-semibold text-foreground">Finish Workout</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

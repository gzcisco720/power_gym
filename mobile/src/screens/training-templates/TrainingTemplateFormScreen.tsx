import React, { useCallback, useMemo, useReducer, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { ExercisePicker } from './ExercisePicker';
import { useTrainingTemplatesStore } from '../../stores/training-templates.store';
import { Exercise, PlanDay, PlanDayExercise } from '../../types/training-templates';
import { AppStackParamList } from '../../navigation/index';

type FormRouteProp = RouteProp<AppStackParamList, 'TrainingTemplateForm'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

// ─── Form state ────────────────────────────────────────────────────────────────

interface FormExercise {
  exerciseId: string;
  exerciseName: string;
  sets: string;
  repsMin: string;
  repsMax: string;
  restSeconds: string;
  isBodyweight: boolean;
}

interface FormDay {
  dayNumber: number;
  name: string;
  exercises: FormExercise[];
}

interface FormState {
  name: string;
  description: string;
  days: FormDay[];
}

type FormAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_DESCRIPTION'; value: string }
  | { type: 'ADD_DAY' }
  | { type: 'REMOVE_DAY'; index: number }
  | { type: 'MOVE_DAY_UP'; index: number }
  | { type: 'MOVE_DAY_DOWN'; index: number }
  | { type: 'SET_DAY_NAME'; index: number; value: string }
  | { type: 'ADD_EXERCISE'; dayIndex: number; exercise: Exercise }
  | { type: 'REMOVE_EXERCISE'; dayIndex: number; exIndex: number }
  | { type: 'SET_EXERCISE_FIELD'; dayIndex: number; exIndex: number; field: keyof FormExercise; value: string };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.value };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.value };
    case 'ADD_DAY': {
      const nextNum = state.days.length + 1;
      const newDay: FormDay = {
        dayNumber: nextNum,
        name: `Day ${nextNum}`,
        exercises: [],
      };
      return { ...state, days: [...state.days, newDay] };
    }
    case 'REMOVE_DAY':
      return {
        ...state,
        days: state.days
          .filter((_, i) => i !== action.index)
          .map((d, i) => ({ ...d, dayNumber: i + 1 })),
      };
    case 'MOVE_DAY_UP': {
      if (action.index === 0) return state;
      const days = [...state.days];
      [days[action.index - 1], days[action.index]] = [days[action.index], days[action.index - 1]];
      return { ...state, days: days.map((d, i) => ({ ...d, dayNumber: i + 1 })) };
    }
    case 'MOVE_DAY_DOWN': {
      if (action.index === state.days.length - 1) return state;
      const days = [...state.days];
      [days[action.index], days[action.index + 1]] = [days[action.index + 1], days[action.index]];
      return { ...state, days: days.map((d, i) => ({ ...d, dayNumber: i + 1 })) };
    }
    case 'SET_DAY_NAME': {
      const days = state.days.map((d, i) =>
        i === action.index ? { ...d, name: action.value } : d,
      );
      return { ...state, days };
    }
    case 'ADD_EXERCISE': {
      const newEx: FormExercise = {
        exerciseId: action.exercise._id,
        exerciseName: action.exercise.name,
        sets: '',
        repsMin: '',
        repsMax: '',
        restSeconds: '',
        isBodyweight: action.exercise.isBodyweight,
      };
      const days = state.days.map((d, i) =>
        i === action.dayIndex ? { ...d, exercises: [...d.exercises, newEx] } : d,
      );
      return { ...state, days };
    }
    case 'REMOVE_EXERCISE': {
      const days = state.days.map((d, i) =>
        i === action.dayIndex
          ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== action.exIndex) }
          : d,
      );
      return { ...state, days };
    }
    case 'SET_EXERCISE_FIELD': {
      const days = state.days.map((d, i) => {
        if (i !== action.dayIndex) return d;
        const exercises = d.exercises.map((ex, ei) =>
          ei === action.exIndex ? { ...ex, [action.field]: action.value } : ex,
        );
        return { ...d, exercises };
      });
      return { ...state, days };
    }
    default:
      return state;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function exerciseIsValid(ex: FormExercise): boolean {
  return (
    ex.sets.trim() !== '' &&
    ex.repsMin.trim() !== '' &&
    ex.repsMax.trim() !== ''
  );
}

function formIsValid(state: FormState): boolean {
  if (!state.name.trim()) return false;
  for (const day of state.days) {
    for (const ex of day.exercises) {
      if (!exerciseIsValid(ex)) return false;
    }
  }
  return true;
}

function buildDays(days: FormDay[]): PlanDay[] {
  return days.map((d) => ({
    dayNumber: d.dayNumber,
    name: d.name,
    exercises: d.exercises.map((ex, i): PlanDayExercise => ({
      groupId: `${ex.exerciseId}-${i}`,
      isSuperset: false,
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      imageUrl: null,
      isBodyweight: ex.isBodyweight,
      sets: parseInt(ex.sets, 10) || 0,
      repsMin: parseInt(ex.repsMin, 10) || 0,
      repsMax: parseInt(ex.repsMax, 10) || 0,
      restSeconds: ex.restSeconds.trim() !== '' ? parseInt(ex.restSeconds, 10) : null,
    })),
  }));
}

function initialStateFromTemplate(template: { name: string; description: string | null; days: PlanDay[] }): FormState {
  return {
    name: template.name,
    description: template.description ?? '',
    days: template.days.map((d) => ({
      dayNumber: d.dayNumber,
      name: d.name,
      exercises: d.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: String(ex.sets),
        repsMin: String(ex.repsMin),
        repsMax: String(ex.repsMax),
        restSeconds: ex.restSeconds !== null ? String(ex.restSeconds) : '',
        isBodyweight: ex.isBodyweight,
      })),
    })),
  };
}

const EMPTY_STATE: FormState = { name: '', description: '', days: [] };

// ─── Component ─────────────────────────────────────────────────────────────────

export function TrainingTemplateFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRouteProp>();
  const { templateId, templateName } = route.params ?? {};
  const insets = useSafeAreaInsets();

  const isEditMode = !!templateId;

  const items = useTrainingTemplatesStore((s) => s.items);
  const createAndAdd = useTrainingTemplatesStore((s) => s.createAndAdd);
  const updateAndSync = useTrainingTemplatesStore((s) => s.updateAndSync);

  const existingTemplate = useMemo(
    () => (isEditMode ? items.find((t) => t._id === templateId) : null),
    [isEditMode, items, templateId],
  );

  const [formState, dispatch] = useReducer(
    formReducer,
    existingTemplate ? initialStateFromTemplate(existingTemplate) : EMPTY_STATE,
  );

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify(
        existingTemplate ? initialStateFromTemplate(existingTemplate) : EMPTY_STATE,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const isDirty = useMemo(
    () => JSON.stringify(formState) !== initialSnapshot,
    [formState, initialSnapshot],
  );

  const isValid = useMemo(() => formIsValid(formState), [formState]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ExercisePicker modal state
  const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);

  const handleSave = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const days = buildDays(formState.days);
      if (isEditMode && templateId) {
        await updateAndSync(templateId, {
          name: formState.name.trim(),
          description: formState.description.trim() || null,
          days,
        });
      } else {
        await createAndAdd({
          name: formState.name.trim(),
          description: formState.description.trim() || null,
          days,
        });
      }
      navigation.goBack();
    } catch {
      setSaving(false);
      setSaveError('Failed to save. Please try again.');
    }
  }, [formState, isEditMode, isValid, navigation, saving, templateId, createAndAdd, updateAndSync]);

  function handlePickerSelect(exercise: Exercise) {
    if (pickerDayIndex === null) return;
    dispatch({ type: 'ADD_EXERCISE', dayIndex: pickerDayIndex, exercise });
    setPickerDayIndex(null);
  }

  return (
    <Screen testID="screen-TrainingTemplateForm">
      <ScreenHeader
        title={isEditMode ? (templateName ?? 'Edit Template') : 'New Template'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-4">
          {/* Name field */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Name <Text className="text-destructive">*</Text>
            </Text>
            <Input
              testID="template-name-input"
              value={formState.name}
              onChangeText={(v) => dispatch({ type: 'SET_NAME', value: v })}
              placeholder="e.g. Push Pull Legs"
              accessibilityLabel="Template name"
              className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            />
          </View>

          {/* Description field */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Description{' '}
              <Text className="text-foreground/65 text-[11px] normal-case">(optional)</Text>
            </Text>
            <Input
              value={formState.description}
              onChangeText={(v) => dispatch({ type: 'SET_DESCRIPTION', value: v })}
              placeholder="Brief description..."
              accessibilityLabel="Template description"
              multiline
              numberOfLines={2}
              className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            />
          </View>

          {/* Days section */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                Days
              </Text>
              <Button
                testID="add-day-button"
                onPress={() => dispatch({ type: 'ADD_DAY' })}
                accessibilityLabel="Add day"
                variant="ghost"
                size="sm"
                className="rounded-lg bg-primary/10 px-2.5 py-1"
              >
                <Text className="text-xs font-semibold text-primary-light">+ Add Day</Text>
              </Button>
            </View>

            {formState.days.length === 0 ? (
              <Text className="text-[13px] text-foreground/65 text-center py-2">
                No days yet. Tap + Add Day.
              </Text>
            ) : (
              formState.days.map((day, dayIndex) => (
                <View
                  key={dayIndex}
                  className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3 gap-2"
                >
                  {/* Day header */}
                  <View className="flex-row items-center gap-2">
                    {/* Reorder buttons */}
                    <View className="gap-0.5">
                      <Pressable
                        onPress={() => dispatch({ type: 'MOVE_DAY_UP', index: dayIndex })}
                        disabled={dayIndex === 0}
                        accessibilityLabel="Move day up"
                        accessibilityRole="button"
                        className={`p-1 ${dayIndex === 0 ? 'opacity-30' : ''}`}
                      >
                        <Text className="text-xs text-foreground/65">▲</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => dispatch({ type: 'MOVE_DAY_DOWN', index: dayIndex })}
                        disabled={dayIndex === formState.days.length - 1}
                        accessibilityLabel="Move day down"
                        accessibilityRole="button"
                        className={`p-1 ${dayIndex === formState.days.length - 1 ? 'opacity-30' : ''}`}
                      >
                        <Text className="text-xs text-foreground/65">▼</Text>
                      </Pressable>
                    </View>

                    <Input
                      value={day.name}
                      onChangeText={(v) =>
                        dispatch({ type: 'SET_DAY_NAME', index: dayIndex, value: v })
                      }
                      placeholder="Day name"
                      accessibilityLabel={`Day ${dayIndex + 1} name`}
                      className="flex-1 rounded-xl bg-input px-2.5 py-1.5 text-sm text-foreground"
                    />

                    <Pressable
                      onPress={() => dispatch({ type: 'REMOVE_DAY', index: dayIndex })}
                      accessibilityLabel="Remove day"
                      accessibilityRole="button"
                      className="p-1"
                    >
                      <Text className="text-sm text-destructive">✕</Text>
                    </Pressable>
                  </View>

                  {/* Exercises */}
                  {day.exercises.map((ex, exIndex) => (
                    <View
                      key={exIndex}
                      className="rounded-xl bg-background ring-1 ring-foreground/[.06] px-2.5 py-2 gap-1.5"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                          {ex.exerciseName}
                        </Text>
                        <Pressable
                          onPress={() => dispatch({ type: 'REMOVE_EXERCISE', dayIndex, exIndex })}
                          accessibilityLabel={`Remove ${ex.exerciseName}`}
                          accessibilityRole="button"
                          className="p-1 ml-1"
                        >
                          <Text className="text-xs text-destructive">✕</Text>
                        </Pressable>
                      </View>
                      {/* Exercise inputs row */}
                      <View className="flex-row gap-1.5">
                        <View className="flex-1 gap-0.5">
                          <Text className="text-[10px] uppercase tracking-wider text-foreground/65">
                            Sets
                          </Text>
                          <Input
                            value={ex.sets}
                            onChangeText={(v) =>
                              dispatch({
                                type: 'SET_EXERCISE_FIELD',
                                dayIndex,
                                exIndex,
                                field: 'sets',
                                value: v,
                              })
                            }
                            keyboardType="decimal-pad"
                            placeholder="3"
                            accessibilityLabel={`Sets for ${ex.exerciseName}`}
                            className="rounded-lg bg-input px-2 py-1.5 text-sm text-foreground text-center"
                          />
                        </View>
                        <View className="flex-1 gap-0.5">
                          <Text className="text-[10px] uppercase tracking-wider text-foreground/65">
                            Min reps
                          </Text>
                          <Input
                            value={ex.repsMin}
                            onChangeText={(v) =>
                              dispatch({
                                type: 'SET_EXERCISE_FIELD',
                                dayIndex,
                                exIndex,
                                field: 'repsMin',
                                value: v,
                              })
                            }
                            keyboardType="decimal-pad"
                            placeholder="8"
                            accessibilityLabel={`Min reps for ${ex.exerciseName}`}
                            className="rounded-lg bg-input px-2 py-1.5 text-sm text-foreground text-center"
                          />
                        </View>
                        <View className="flex-1 gap-0.5">
                          <Text className="text-[10px] uppercase tracking-wider text-foreground/65">
                            Max reps
                          </Text>
                          <Input
                            value={ex.repsMax}
                            onChangeText={(v) =>
                              dispatch({
                                type: 'SET_EXERCISE_FIELD',
                                dayIndex,
                                exIndex,
                                field: 'repsMax',
                                value: v,
                              })
                            }
                            keyboardType="decimal-pad"
                            placeholder="12"
                            accessibilityLabel={`Max reps for ${ex.exerciseName}`}
                            className="rounded-lg bg-input px-2 py-1.5 text-sm text-foreground text-center"
                          />
                        </View>
                        <View className="flex-1 gap-0.5">
                          <Text className="text-[10px] uppercase tracking-wider text-foreground/65">
                            Rest (s)
                          </Text>
                          <Input
                            value={ex.restSeconds}
                            onChangeText={(v) =>
                              dispatch({
                                type: 'SET_EXERCISE_FIELD',
                                dayIndex,
                                exIndex,
                                field: 'restSeconds',
                                value: v,
                              })
                            }
                            keyboardType="decimal-pad"
                            placeholder="90"
                            accessibilityLabel={`Rest seconds for ${ex.exerciseName}`}
                            className="rounded-lg bg-input px-2 py-1.5 text-sm text-foreground text-center"
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Add exercise button */}
                  <Pressable
                    testID={`add-exercise-button-${dayIndex}`}
                    onPress={() => setPickerDayIndex(dayIndex)}
                    accessibilityLabel="Add exercise"
                    accessibilityRole="button"
                    className="rounded-xl bg-foreground/[.04] border border-dashed border-foreground/20 px-3 py-2 items-center"
                  >
                    <Text className="text-xs text-foreground/65">+ Add Exercise</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {saveError ? (
            <Text className="text-xs text-destructive text-center">{saveError}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky save bar */}
      <View
        className="border-t border-foreground/10 bg-background/95 px-4 py-3 flex-row gap-2"
        style={{ paddingBottom: insets.bottom || 12 }}
      >
        <Button
          onPress={() => navigation.goBack()}
          accessibilityLabel="Cancel"
          variant="ghost"
          className="flex-1 py-3 rounded-xl bg-muted items-center"
        >
          <Text className="text-sm font-semibold text-foreground/65">Cancel</Text>
        </Button>
        <Button
          testID="template-save-button"
          onPress={handleSave}
          disabled={!isDirty || !isValid || saving}
          accessibilityLabel="Save template"
          accessibilityState={{ disabled: !isDirty || !isValid || saving }}
          variant="default"
          className={`flex-1 py-3 rounded-xl items-center ${
            isDirty && isValid && !saving ? 'bg-primary' : 'bg-primary/30'
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text className="text-sm font-semibold text-foreground">Save</Text>
          )}
        </Button>
      </View>

      {/* Exercise Picker Modal */}
      <Modal
        visible={pickerDayIndex !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerDayIndex(null)}
      >
        <ExercisePicker
          onSelect={handlePickerSelect}
          onClose={() => setPickerDayIndex(null)}
        />
      </Modal>
    </Screen>
  );
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExercisesStore } from '../../stores/exercises.store';
import { Exercise } from '../../types/training-templates';
import { createExercise } from '../../lib/api/exercises.api';

interface ExercisePickerProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({ onSelect, onClose }: ExercisePickerProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useExercisesStore((s) => s.results);
  const loading = useExercisesStore((s) => s.loading);
  const search = useExercisesStore((s) => s.search);
  const addResult = useExercisesStore((s) => s.addResult);
  // training templates store not needed here but referenced in spec mock setup

  // Load all exercises on mount
  useEffect(() => {
    void search('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void search(text);
      }, 300);
    },
    [search],
  );

  async function handleCreateCustom() {
    if (!query.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const exercise = await createExercise({
        name: query.trim(),
        muscleGroup: null,
        isBodyweight: false,
      });
      addResult(exercise);
      onSelect(exercise);
    } catch {
      setCreateError('Failed to create exercise. Please try again.');
      setCreating(false);
    }
  }

  return (
    <View
      testID="exercise-picker"
      className="flex-1 bg-background"
      style={{ paddingBottom: insets.bottom || 12 }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] px-4 py-4">
        <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
          Pick Exercise
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close exercise picker"
          accessibilityRole="button"
          className="p-1"
        >
          <Text className="text-[18px] text-foreground/65">✕</Text>
        </Pressable>
      </View>

      {/* Search input */}
      <View className="px-4 py-3 border-b border-foreground/[.06]">
        <TextInput
          testID="exercise-search-input"
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search exercises..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          accessibilityLabel="Search exercises"
          className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
        />
      </View>

      {/* Create custom option */}
      <Pressable
        testID="create-custom-exercise-button"
        onPress={handleCreateCustom}
        disabled={creating}
        accessibilityLabel="Create custom exercise"
        accessibilityRole="button"
        className="mx-4 mt-3 mb-1 flex-row items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5"
      >
        {creating ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text className="text-sm font-semibold text-primary-light">
            {query.trim() ? `Create "${query.trim()}"` : 'Create custom exercise'}
          </Text>
        )}
      </Pressable>
      {createError ? (
        <Text className="mx-4 text-xs text-destructive">{createError}</Text>
      ) : null}

      {/* Results list */}
      <ScrollView className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
        <View className="px-4 gap-1.5 pb-4">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <View key={i} className="rounded-xl bg-muted h-12 opacity-60" />
              ))}
            </>
          ) : results.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No exercises found.
            </Text>
          ) : (
            results.map((exercise) => (
              <Pressable
                key={exercise._id}
                testID={`exercise-result-${exercise._id}`}
                onPress={() => onSelect(exercise)}
                accessibilityLabel={exercise.name}
                accessibilityRole="button"
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
              >
                <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                  {exercise.name}
                </Text>
                {exercise.muscleGroup ? (
                  <Text className="text-xs text-foreground/65 ml-2">{exercise.muscleGroup}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

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
import { useFoodsStore } from '../../../stores/foods.store';
import { createFood } from '../../../lib/api/foods.api';
import { Food } from '../../../types/nutrition-templates';

interface FoodSearchSheetProps {
  onSelect: (food: Food) => void;
  onClose: () => void;
}

export function FoodSearchSheet({ onSelect, onClose }: FoodSearchSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useFoodsStore((s) => s.results);
  const loading = useFoodsStore((s) => s.loading);
  const search = useFoodsStore((s) => s.search);
  const addResult = useFoodsStore((s) => s.addResult);

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
      const food = await createFood({
        name: query.trim(),
        macrosPer100g: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      });
      addResult(food);
      onSelect(food);
    } catch {
      setCreateError('Failed to create food. Please try again.');
      setCreating(false);
    }
  }

  return (
    <View
      testID="food-search-sheet"
      className="flex-1 bg-background"
      style={{ paddingBottom: insets.bottom || 12 }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] px-4 py-4">
        <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
          Search Foods
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close food search"
          accessibilityRole="button"
          className="p-1"
        >
          <Text className="text-[18px] text-foreground/65">✕</Text>
        </Pressable>
      </View>

      {/* Search input */}
      <View className="px-4 py-3 border-b border-foreground/[.06]">
        <TextInput
          testID="food-search-input"
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search foods..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          accessibilityLabel="Search foods"
          className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
        />
      </View>

      {/* Create custom food option */}
      <Pressable
        testID="create-custom-food-button"
        onPress={handleCreateCustom}
        disabled={creating}
        accessibilityLabel="Create custom food"
        accessibilityRole="button"
        className="mx-4 mt-3 mb-1 flex-row items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5"
      >
        {creating ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text className="text-sm font-semibold text-primary-light">
            {query.trim() ? `Create "${query.trim()}"` : 'Create custom food'}
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
              No foods found.
            </Text>
          ) : (
            results.map((food) => (
              <Pressable
                key={food._id}
                testID={`food-result-${food.name}`}
                onPress={() => onSelect(food)}
                accessibilityLabel={food.name}
                accessibilityRole="button"
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
              >
                <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                  {food.name}
                </Text>
                <View className="flex-row gap-2 ml-2">
                  <Text className="text-xs text-foreground/65 tabular-nums">
                    {food.macrosPer100g.kcal} kcal
                  </Text>
                  <Text className="text-xs text-foreground/65 tabular-nums">
                    {food.macrosPer100g.protein}g P
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

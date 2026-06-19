import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import {
  Dialog,
  DialogContent,
} from '../../components/ui/dialog';
import { useFoodsStore } from '../../stores/foods.store';
import { Food } from '../../types/nutrition-templates';
import { FoodCard } from './components/FoodCard';
import { AppStackParamList } from '../../navigation/index';
import { colors } from '../../lib/theme';

type FoodsScreenNav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

export function FoodsScreen() {
  const navigation = useNavigation<FoodsScreenNav>();
  const results = useFoodsStore((s) => s.results);
  const loading = useFoodsStore((s) => s.loading);
  const search = useFoodsStore((s) => s.search);
  const remove = useFoodsStore((s) => s.remove);

  const [query, setQuery] = useState('');
  const [pendingDeleteFood, setPendingDeleteFood] = useState<Food | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void search('');
  }, [search]);

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

  function handleAddPress() {
    navigation.navigate('FoodForm', {});
  }

  function handleCardPress(food: Food) {
    navigation.navigate('FoodForm', { food });
  }

  function handleDeletePress(food: Food) {
    setPendingDeleteFood(food);
  }

  function handleDeleteConfirm() {
    if (!pendingDeleteFood) return;
    const id = pendingDeleteFood._id;
    setPendingDeleteFood(null);
    void remove(id);
  }

  function handleDeleteCancel() {
    setPendingDeleteFood(null);
  }

  return (
    <Screen testID="screen-Foods">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Foods
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">Manage food database</Text>
        </View>
        <Pressable
          testID="foods-add-button"
          onPress={handleAddPress}
          accessibilityLabel="Add food"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-xl bg-primary"
        >
          <Text className="text-sm font-semibold text-foreground">+</Text>
        </Pressable>
      </View>

      {/* Search input */}
      <View className="border-b border-foreground/[.06] bg-background px-4 py-2.5">
        <View className="flex-row items-center rounded-xl bg-input px-3 gap-2">
          <Text className="text-foreground/40 text-sm">⌕</Text>
          <TextInput
            testID="foods-search-input"
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search foods..."
            placeholderTextColor={colors.placeholderText}
            accessibilityLabel="Search foods"
            className="flex-1 py-2.5 text-sm text-foreground"
          />
          {loading ? (
            <ActivityIndicator size="small" color={colors.placeholderText} />
          ) : query.length > 0 ? (
            <Pressable
              onPress={() => handleQueryChange('')}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Text className="text-foreground/40 text-sm">✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* List */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-2">
          {loading ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} className="rounded-xl bg-muted px-3 py-2 h-12 opacity-60" />
              ))}
            </>
          ) : results.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-8">
              No foods found.
            </Text>
          ) : (
            results.map((food) => (
              <FoodCard
                key={food._id}
                food={food}
                onPress={() => handleCardPress(food)}
                onDelete={() => handleDeletePress(food)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Delete confirm dialog */}
      <Dialog
        open={pendingDeleteFood !== null}
        onOpenChange={(open) => { if (!open) handleDeleteCancel(); }}
      >
        <DialogContent>
          <Text className="text-[15px] font-semibold text-foreground mb-1">Delete food?</Text>
          <Text className="text-[13px] text-foreground/65 mb-4">
            {`"${pendingDeleteFood?.name ?? ''}" will be permanently deleted.`}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleDeleteCancel}
              accessibilityLabel="Cancel delete"
              accessibilityRole="button"
              className="flex-1 rounded-xl bg-muted py-3 items-center"
            >
              <Text className="text-sm font-semibold text-foreground/65">Cancel</Text>
            </Pressable>
            <Pressable
              testID="food-delete-confirm"
              onPress={handleDeleteConfirm}
              accessibilityLabel="Confirm delete"
              accessibilityRole="button"
              className="flex-1 rounded-xl bg-destructive/10 py-3 items-center"
            >
              <Text className="text-sm font-semibold text-destructive">Delete</Text>
            </Pressable>
          </View>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

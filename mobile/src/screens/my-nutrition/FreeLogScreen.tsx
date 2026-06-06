import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useFoodsStore } from '../../stores/foods.store';
import { useSelfNutritionStore } from '../../stores/self-nutrition.store';
import { Food } from '../../types/nutrition-templates';
import { AppStackParamList } from '../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList>;

function computeMacros(food: Food, quantityG: number) {
  const factor = quantityG / 100;
  return {
    kcal: Math.round(food.macrosPer100g.kcal * factor),
    protein: Math.round(food.macrosPer100g.protein * factor * 10) / 10,
    carbs: Math.round(food.macrosPer100g.carbs * factor * 10) / 10,
    fat: Math.round(food.macrosPer100g.fat * factor * 10) / 10,
  };
}

export function FreeLogScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [validationError, setValidationError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useFoodsStore((s) => s.results);
  const foodsLoading = useFoodsStore((s) => s.loading);
  const search = useFoodsStore((s) => s.search);

  const log = useSelfNutritionStore((s) => s.log);
  const logging = useSelfNutritionStore((s) => s.logging);
  const fetchToday = useSelfNutritionStore((s) => s.fetchToday);
  const logFood = useSelfNutritionStore((s) => s.logFood);

  useEffect(() => {
    void fetchToday();
    void search('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      setSelectedFood(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void search(text);
      }, 300);
    },
    [search],
  );

  async function handleConfirm() {
    if (!selectedFood) {
      setValidationError('Please select a food first.');
      return;
    }
    const quantityG = parseFloat(quantity);
    if (!quantityG || quantityG <= 0) {
      setValidationError('Enter a valid quantity.');
      return;
    }
    setValidationError('');
    const macros = computeMacros(selectedFood, quantityG);
    await logFood({
      foodName: selectedFood.name,
      quantityG,
      ...macros,
    });
    setSelectedFood(null);
    setQuantity('100');
    setQuery('');
  }

  return (
    <Screen testID="screen-FreeLog">
      <ScreenHeader title="Log freely" onBack={() => navigation.goBack()} />

      {/* Search input */}
      <View className="px-4 py-3 border-b border-foreground/[.06]">
        <TextInput
          testID="free-log-food-search"
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search foods..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          accessibilityLabel="Search foods"
          className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
        />
      </View>

      {/* Selected food + quantity form */}
      {selectedFood ? (
        <View className="px-4 py-3 border-b border-foreground/[.06] gap-2">
          <Text className="text-sm font-semibold text-foreground">{selectedFood.name}</Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              testID="free-log-quantity-input"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              accessibilityLabel="Quantity in grams"
              className="flex-1 rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            />
            <Text className="text-sm text-foreground/65">g</Text>
          </View>
        </View>
      ) : null}

      {/* Validation error */}
      {validationError ? (
        <View className="px-4 pt-2">
          <Text className="text-xs text-destructive">{validationError}</Text>
        </View>
      ) : null}

      {/* Log button */}
      <View className="px-4 py-3 border-b border-foreground/[.06]">
        <Pressable
          testID="free-log-confirm"
          onPress={() => void handleConfirm()}
          disabled={logging}
          accessibilityLabel="Log food"
          accessibilityRole="button"
          className="rounded-xl bg-primary px-4 py-2.5 items-center"
        >
          {logging ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-foreground">Log Food</Text>
          )}
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Today's logged items */}
        {log && log.items.length > 0 ? (
          <View className="px-4 pt-4 gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Today
            </Text>
            <View
              testID="free-log-total-kcal"
              className="rounded-xl bg-primary/10 ring-1 ring-primary/20 px-3 py-2 flex-row items-center justify-between"
            >
              <Text className="text-sm text-foreground/65">Total</Text>
              <Text className="text-sm font-semibold tabular-nums text-foreground">
                {log.totals.kcal} kcal
              </Text>
            </View>
            {log.items.map((item, index) => (
              <View
                key={`${item.foodName}-${index}`}
                testID={`free-log-item-${index}`}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between"
              >
                <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                  {item.foodName}
                </Text>
                <View className="flex-row gap-2 ml-2">
                  <Text className="text-xs text-foreground/65 tabular-nums">
                    {item.quantityG}g
                  </Text>
                  <Text className="text-xs text-foreground/65 tabular-nums">
                    {item.kcal} kcal
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Food search results */}
        <View className="px-4 py-3 gap-1.5" style={{ paddingBottom: insets.bottom || 12 }}>
          {foodsLoading ? (
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
                testID={`free-food-result-${food.name}`}
                onPress={() => setSelectedFood(food)}
                accessibilityLabel={food.name}
                accessibilityRole="button"
                className={`rounded-xl ring-1 px-3 py-2 flex-row items-center justify-between ${
                  selectedFood?._id === food._id
                    ? 'bg-primary/10 ring-primary/30'
                    : 'bg-card ring-foreground/10'
                }`}
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
    </Screen>
  );
}

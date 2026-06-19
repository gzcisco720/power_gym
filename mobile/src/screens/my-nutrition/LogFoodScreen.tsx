import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { useFoodsStore } from '../../stores/foods.store';
import { useNutritionStore } from '../../stores/nutrition.store';
import { Food } from '../../types/nutrition-templates';
import { AppStackParamList } from '../../navigation/index';

type LogFoodRouteProp = RouteProp<AppStackParamList, 'LogFood'>;
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

export function LogFoodScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<LogFoodRouteProp>();
  const insets = useSafeAreaInsets();
  const { mealName } = route.params;

  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useFoodsStore((s) => s.results);
  const loading = useFoodsStore((s) => s.loading);
  const search = useFoodsStore((s) => s.search);

  const logFood = useNutritionStore((s) => s.logFood);

  useEffect(() => {
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

  function handleSelectFood(food: Food) {
    setSelectedFood(food);
  }

  async function handleConfirm() {
    if (!selectedFood) return;
    const quantityG = parseFloat(quantity);
    if (!quantityG || quantityG <= 0) return;

    setSubmitting(true);
    try {
      const macros = computeMacros(selectedFood, quantityG);
      await logFood({
        mealName,
        foodName: selectedFood.name,
        quantityG,
        ...macros,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen testID="screen-LogFood">
      <ScreenHeader title={"Log Food " + mealName} onBack={() => navigation.goBack()} />

      {/* Search input */}
      <View className="px-4 py-3 border-b border-foreground/[.06]">
        <Input
          testID="food-search-input"
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search foods..."
          accessibilityLabel="Search foods"
          className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground h-auto"
        />
      </View>

      {/* Selected food + quantity form */}
      {selectedFood ? (
        <View className="px-4 py-3 border-b border-foreground/[.06] gap-2">
          <Text className="text-sm font-semibold text-foreground">{selectedFood.name}</Text>
          <View className="flex-row items-center gap-3">
            <Input
              testID="quantity-input"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              accessibilityLabel="Quantity in grams"
              className="flex-1 rounded-xl bg-input px-3 py-2.5 text-sm text-foreground h-auto"
            />
            <Text className="text-sm text-foreground/65">g</Text>
          </View>
          <Button
            testID="confirm-log-food"
            onPress={() => void handleConfirm()}
            disabled={submitting}
            accessibilityLabel="Confirm log food"
            className="rounded-xl bg-primary px-4 items-center h-auto py-2.5"
          >
            <Text className="text-sm font-semibold text-foreground">Log Food</Text>
          </Button>
        </View>
      ) : null}

      {/* Results list */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-3 gap-1.5 pb-4" style={{ paddingBottom: insets.bottom || 12 }}>
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
                testID={"food-result-" + food.name}
                onPress={() => handleSelectFood(food)}
                accessibilityLabel={food.name}
                accessibilityRole="button"
                className={food._id === (selectedFood && selectedFood._id)
                    ? 'rounded-xl ring-1 px-3 py-2 flex-row items-center justify-between bg-primary/10 ring-primary/30'
                    : 'rounded-xl ring-1 px-3 py-2 flex-row items-center justify-between bg-card ring-foreground/10'
                }
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

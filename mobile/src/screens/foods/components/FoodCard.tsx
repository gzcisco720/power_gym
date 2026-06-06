import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Food } from '../../../types/nutrition-templates';

interface FoodCardProps {
  food: Food;
  onPress: () => void;
  onDelete: () => void;
}

export function FoodCard({ food, onPress, onDelete }: FoodCardProps) {
  const { _id, name, brand, macrosPer100g } = food;

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        testID={`food-card-${_id}`}
        onPress={onPress}
        accessibilityLabel={name}
        accessibilityRole="button"
        className="flex-1 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
      >
        <View className="flex-row items-center justify-between gap-2">
          {/* Left: name + brand */}
          <View className="flex-1 gap-0.5">
            <Text className="text-[13px] font-medium text-foreground" numberOfLines={1}>
              {name}
            </Text>
            {brand ? (
              <Text className="text-[11px] text-foreground/65" numberOfLines={1}>
                {brand}
              </Text>
            ) : null}
          </View>

          {/* Right: macro pills */}
          <View className="flex-row items-center gap-1.5">
            <View className="rounded-full bg-foreground/10 px-2 py-0.5">
              <Text className="text-[10px] font-medium text-foreground/65">
                {macrosPer100g.kcal} kcal
              </Text>
            </View>
            <View className="rounded-full bg-emerald-500/15 px-2 py-0.5">
              <Text className="text-[10px] font-medium text-emerald-300">
                {macrosPer100g.protein}g P
              </Text>
            </View>
            <View className="rounded-full bg-amber-500/15 px-2 py-0.5">
              <Text className="text-[10px] font-medium text-amber-300">
                {macrosPer100g.carbs}g C
              </Text>
            </View>
            <View className="rounded-full bg-pink-500/15 px-2 py-0.5">
              <Text className="text-[10px] font-medium text-pink-300">
                {macrosPer100g.fat}g F
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      <Pressable
        testID={`food-delete-${_id}`}
        onPress={onDelete}
        accessibilityLabel={`Delete ${name}`}
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-xl bg-destructive/10"
      >
        <Text className="text-sm text-destructive">✕</Text>
      </Pressable>
    </View>
  );
}

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DailyLogMeal } from '../../../types/nutrition';
import { AppStackParamList } from '../../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList>;

interface MealCardProps {
  meal: DailyLogMeal;
}

export function MealCard({ meal }: MealCardProps) {
  const navigation = useNavigation<Nav>();

  function handleLogFood() {
    navigation.navigate('LogFood', { mealName: meal.name });
  }

  return (
    <View
      testID={`meal-card-${meal.order}`}
      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-1.5"
    >
      {/* Meal header */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-foreground">{meal.name}</Text>
        <Pressable
          testID="log-food-button"
          onPress={handleLogFood}
          accessibilityLabel={`Log food for ${meal.name}`}
          accessibilityRole="button"
          className="rounded-lg bg-primary/10 px-2.5 py-1"
        >
          <Text className="text-xs font-semibold text-primary-light">+ Log</Text>
        </Pressable>
      </View>

      {/* Logged food items */}
      {meal.items.length === 0 ? (
        <Text className="text-xs text-foreground/40 italic">No food logged yet</Text>
      ) : (
        meal.items.map((item, idx) => (
          <View
            key={`${item.foodName}-${idx}`}
            testID={`food-item-${item.foodName}`}
            className="flex-row items-center justify-between"
          >
            <Text className="text-xs text-foreground flex-1" numberOfLines={1}>
              {item.foodName}
            </Text>
            <View className="flex-row gap-2 ml-2">
              <Text className="text-xs text-foreground/65 tabular-nums">{item.quantityG}g</Text>
              <Text className="text-xs text-foreground/65 tabular-nums">{item.kcal} kcal</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

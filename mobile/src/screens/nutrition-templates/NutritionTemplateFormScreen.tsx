import React, { useCallback, useMemo, useReducer, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FoodSearchSheet } from './components/FoodSearchSheet';
import { useNutritionTemplatesStore } from '../../stores/nutrition-templates.store';
import { scaleMacros } from '../../lib/nutrition-macros';
import { Food, DayType, Meal, MealItem } from '../../types/nutrition-templates';
import { AppStackParamList } from '../../navigation/index';

type FormRouteProp = RouteProp<AppStackParamList, 'NutritionTemplateForm'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

// ─── Form state ────────────────────────────────────────────────────────────────

interface FormItem {
  foodName: string;
  quantityG: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FormMeal {
  name: string;
  order: number;
  items: FormItem[];
}

interface FormDayType {
  name: string;
  meals: FormMeal[];
}

interface FormState {
  name: string;
  dayTypes: FormDayType[];
}

type FormAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'ADD_DAY_TYPE' }
  | { type: 'REMOVE_DAY_TYPE'; index: number }
  | { type: 'SET_DAY_TYPE_NAME'; index: number; value: string }
  | { type: 'ADD_MEAL'; dayTypeIndex: number }
  | { type: 'REMOVE_MEAL'; dayTypeIndex: number; mealIndex: number }
  | { type: 'SET_MEAL_NAME'; dayTypeIndex: number; mealIndex: number; value: string }
  | { type: 'ADD_ITEM'; dayTypeIndex: number; mealIndex: number; item: FormItem }
  | { type: 'REMOVE_ITEM'; dayTypeIndex: number; mealIndex: number; itemIndex: number }
  | {
      type: 'SET_ITEM_QUANTITY';
      dayTypeIndex: number;
      mealIndex: number;
      itemIndex: number;
      quantityG: string;
      food: Food;
    };

const DAY_TYPE_NAMES = ['Training Day', 'Rest Day', 'Active Recovery', 'Competition Day'];

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.value };

    case 'ADD_DAY_TYPE': {
      const usedNames = state.dayTypes.map((dt) => dt.name);
      const nextName =
        DAY_TYPE_NAMES.find((n) => !usedNames.includes(n)) ??
        `Day Type ${state.dayTypes.length + 1}`;
      return {
        ...state,
        dayTypes: [...state.dayTypes, { name: nextName, meals: [] }],
      };
    }

    case 'REMOVE_DAY_TYPE':
      return {
        ...state,
        dayTypes: state.dayTypes.filter((_, i) => i !== action.index),
      };

    case 'SET_DAY_TYPE_NAME': {
      const dayTypes = state.dayTypes.map((dt, i) =>
        i === action.index ? { ...dt, name: action.value } : dt,
      );
      return { ...state, dayTypes };
    }

    case 'ADD_MEAL': {
      const dayTypes = state.dayTypes.map((dt, i) => {
        if (i !== action.dayTypeIndex) return dt;
        const nextOrder = dt.meals.length;
        const newMeal: FormMeal = {
          name: `Meal ${nextOrder + 1}`,
          order: nextOrder,
          items: [],
        };
        return { ...dt, meals: [...dt.meals, newMeal] };
      });
      return { ...state, dayTypes };
    }

    case 'REMOVE_MEAL': {
      const dayTypes = state.dayTypes.map((dt, i) => {
        if (i !== action.dayTypeIndex) return dt;
        return {
          ...dt,
          meals: dt.meals
            .filter((_, mi) => mi !== action.mealIndex)
            .map((m, mi) => ({ ...m, order: mi })),
        };
      });
      return { ...state, dayTypes };
    }

    case 'SET_MEAL_NAME': {
      const dayTypes = state.dayTypes.map((dt, i) => {
        if (i !== action.dayTypeIndex) return dt;
        const meals = dt.meals.map((m, mi) =>
          mi === action.mealIndex ? { ...m, name: action.value } : m,
        );
        return { ...dt, meals };
      });
      return { ...state, dayTypes };
    }

    case 'ADD_ITEM': {
      const dayTypes = state.dayTypes.map((dt, i) => {
        if (i !== action.dayTypeIndex) return dt;
        const meals = dt.meals.map((m, mi) => {
          if (mi !== action.mealIndex) return m;
          return { ...m, items: [...m.items, action.item] };
        });
        return { ...dt, meals };
      });
      return { ...state, dayTypes };
    }

    case 'REMOVE_ITEM': {
      const dayTypes = state.dayTypes.map((dt, i) => {
        if (i !== action.dayTypeIndex) return dt;
        const meals = dt.meals.map((m, mi) => {
          if (mi !== action.mealIndex) return m;
          return { ...m, items: m.items.filter((_, ii) => ii !== action.itemIndex) };
        });
        return { ...dt, meals };
      });
      return { ...state, dayTypes };
    }

    case 'SET_ITEM_QUANTITY': {
      const qNum = parseFloat(action.quantityG) || 0;
      const scaled = scaleMacros(action.food.macrosPer100g, qNum);
      const dayTypes = state.dayTypes.map((dt, i) => {
        if (i !== action.dayTypeIndex) return dt;
        const meals = dt.meals.map((m, mi) => {
          if (mi !== action.mealIndex) return m;
          const items = m.items.map((item, ii) =>
            ii === action.itemIndex
              ? {
                  ...item,
                  quantityG: action.quantityG,
                  kcal: scaled.kcal,
                  protein: scaled.protein,
                  carbs: scaled.carbs,
                  fat: scaled.fat,
                }
              : item,
          );
          return { ...m, items };
        });
        return { ...dt, meals };
      });
      return { ...state, dayTypes };
    }

    default:
      return state;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formIsValid(state: FormState): boolean {
  return state.name.trim().length > 0;
}

function buildDayTypes(formDayTypes: FormDayType[]): DayType[] {
  return formDayTypes.map((dt) => ({
    name: dt.name,
    meals: dt.meals.map(
      (m): Meal => ({
        name: m.name,
        order: m.order,
        items: m.items.map(
          (item): MealItem => ({
            foodName: item.foodName,
            quantityG: parseFloat(item.quantityG) || 0,
            kcal: item.kcal,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
          }),
        ),
      }),
    ),
  }));
}

function initialStateFromTemplate(template: {
  name: string;
  dayTypes: DayType[];
}): FormState {
  return {
    name: template.name,
    dayTypes: template.dayTypes.map((dt) => ({
      name: dt.name,
      meals: dt.meals.map((m) => ({
        name: m.name,
        order: m.order,
        items: m.items.map((item) => ({
          foodName: item.foodName,
          quantityG: String(item.quantityG),
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        })),
      })),
    })),
  };
}

const EMPTY_STATE: FormState = { name: '', dayTypes: [] };

// ─── Component ─────────────────────────────────────────────────────────────────

export function NutritionTemplateFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRouteProp>();
  const { templateId, templateName } = route.params ?? {};
  const insets = useSafeAreaInsets();

  const isEditMode = !!templateId;

  const items = useNutritionTemplatesStore((s) => s.items);
  const createTemplate = useNutritionTemplatesStore((s) => s.createTemplate);
  const updateTemplate = useNutritionTemplatesStore((s) => s.updateTemplate);

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

  // Food picker modal state: { dayTypeIndex, mealIndex } | null
  const [pickerTarget, setPickerTarget] = useState<{
    dayTypeIndex: number;
    mealIndex: number;
  } | null>(null);

  const handleSave = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const dayTypes = buildDayTypes(formState.dayTypes);
      if (isEditMode && templateId) {
        await updateTemplate(templateId, {
          name: formState.name.trim(),
          dayTypes,
        });
      } else {
        await createTemplate({
          name: formState.name.trim(),
          dayTypes,
        });
      }
      navigation.goBack();
    } catch {
      setSaving(false);
      setSaveError('Failed to save. Please try again.');
    }
  }, [formState, isEditMode, isValid, navigation, saving, templateId, createTemplate, updateTemplate]);

  function handleFoodSelect(food: Food) {
    if (!pickerTarget) return;
    const { dayTypeIndex, mealIndex } = pickerTarget;
    const DEFAULT_QG = 100;
    const scaled = scaleMacros(food.macrosPer100g, DEFAULT_QG);
    const newItem: FormItem = {
      foodName: food.name,
      quantityG: String(DEFAULT_QG),
      kcal: scaled.kcal,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fat: scaled.fat,
    };
    dispatch({ type: 'ADD_ITEM', dayTypeIndex, mealIndex, item: newItem });
    setPickerTarget(null);
  }

  return (
    <Screen testID="screen-NutritionTemplateForm">
      <ScreenHeader
        title={isEditMode ? (templateName ?? 'Edit Template') : 'New Nutrition Template'}
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
              placeholder="e.g. High Protein Plan"
              accessibilityLabel="Template name"
              className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            />
          </View>

          {/* Day types section */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                Day Types
              </Text>
              <Button
                testID="add-day-type-button"
                onPress={() => dispatch({ type: 'ADD_DAY_TYPE' })}
                accessibilityLabel="Add day type"
                variant="ghost"
                size="sm"
                className="rounded-lg bg-primary/10 px-2.5 py-1"
              >
                <Text className="text-xs font-semibold text-primary-light">+ Add Day Type</Text>
              </Button>
            </View>

            {formState.dayTypes.length === 0 ? (
              <Text className="text-[13px] text-foreground/65 text-center py-2">
                No day types yet. Tap + Add Day Type.
              </Text>
            ) : (
              formState.dayTypes.map((dayType, dayTypeIndex) => (
                <View
                  key={dayTypeIndex}
                  className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3 gap-2"
                >
                  {/* Day type header */}
                  <View className="flex-row items-center gap-2">
                    <Input
                      value={dayType.name}
                      onChangeText={(v) =>
                        dispatch({ type: 'SET_DAY_TYPE_NAME', index: dayTypeIndex, value: v })
                      }
                      placeholder="Day type name"
                      accessibilityLabel={`Day type ${dayTypeIndex + 1} name`}
                      className="flex-1 rounded-xl bg-input px-2.5 py-1.5 text-sm text-foreground"
                    />
                    <Pressable
                      testID={`remove-day-type-${dayTypeIndex}`}
                      onPress={() => dispatch({ type: 'REMOVE_DAY_TYPE', index: dayTypeIndex })}
                      accessibilityLabel="Remove day type"
                      accessibilityRole="button"
                      className="p-1"
                    >
                      <Text className="text-sm text-destructive">✕</Text>
                    </Pressable>
                  </View>

                  {/* Meals */}
                  {dayType.meals.map((meal, mealIndex) => (
                    <View
                      key={mealIndex}
                      className="rounded-xl bg-background ring-1 ring-foreground/[.06] px-2.5 py-2 gap-1.5"
                    >
                      {/* Meal header */}
                      <View className="flex-row items-center gap-2">
                        <Input
                          value={meal.name}
                          onChangeText={(v) =>
                            dispatch({
                              type: 'SET_MEAL_NAME',
                              dayTypeIndex,
                              mealIndex,
                              value: v,
                            })
                          }
                          placeholder="Meal name"
                          accessibilityLabel={`Meal ${mealIndex + 1} name`}
                          className="flex-1 rounded-lg bg-input px-2 py-1.5 text-sm text-foreground"
                        />
                        <Pressable
                          onPress={() =>
                            dispatch({ type: 'REMOVE_MEAL', dayTypeIndex, mealIndex })
                          }
                          accessibilityLabel="Remove meal"
                          accessibilityRole="button"
                          className="p-1"
                        >
                          <Text className="text-xs text-destructive">✕</Text>
                        </Pressable>
                      </View>

                      {/* Items */}
                      {meal.items.map((item, itemIndex) => (
                        <View
                          key={itemIndex}
                          className="flex-row items-center gap-1.5 py-0.5"
                        >
                          <Text
                            className="text-sm text-foreground flex-1"
                            numberOfLines={1}
                          >
                            {item.foodName}
                          </Text>
                          <Input
                            value={item.quantityG}
                            onChangeText={(v) => {
                              // We need food data to rescale — store food reference via a lookup
                              dispatch({
                                type: 'SET_ITEM_QUANTITY',
                                dayTypeIndex,
                                mealIndex,
                                itemIndex,
                                quantityG: v,
                                food: {
                                  _id: '',
                                  name: item.foodName,
                                  brand: null,
                                  macrosPer100g: {
                                    kcal: item.kcal > 0 ? Math.round((item.kcal / (parseFloat(item.quantityG) || 100)) * 100) : 0,
                                    protein: item.protein > 0 ? Math.round((item.protein / (parseFloat(item.quantityG) || 100)) * 100) : 0,
                                    carbs: item.carbs > 0 ? Math.round((item.carbs / (parseFloat(item.quantityG) || 100)) * 100) : 0,
                                    fat: item.fat > 0 ? Math.round((item.fat / (parseFloat(item.quantityG) || 100)) * 100) : 0,
                                  },
                                  servings: [],
                                  createdBy: '',
                                  createdAt: '',
                                },
                              });
                            }}
                            keyboardType="decimal-pad"
                            placeholder="100"
                            accessibilityLabel={`Quantity for ${item.foodName}`}
                            className="rounded-lg bg-input px-2 py-1 text-sm text-foreground text-center w-16"
                          />
                          <Text className="text-xs text-foreground/65">g</Text>
                          <Pressable
                            onPress={() =>
                              dispatch({ type: 'REMOVE_ITEM', dayTypeIndex, mealIndex, itemIndex })
                            }
                            accessibilityLabel={`Remove ${item.foodName}`}
                            accessibilityRole="button"
                            className="p-1"
                          >
                            <Text className="text-xs text-destructive">✕</Text>
                          </Pressable>
                        </View>
                      ))}

                      {/* Add food button */}
                      <Pressable
                        testID={`add-food-button-${dayTypeIndex}-${mealIndex}`}
                        onPress={() => setPickerTarget({ dayTypeIndex, mealIndex })}
                        accessibilityLabel="Add food item"
                        accessibilityRole="button"
                        className="rounded-xl bg-foreground/[.04] border border-dashed border-foreground/20 px-3 py-2 items-center"
                      >
                        <Text className="text-xs text-foreground/65">+ Add Food</Text>
                      </Pressable>
                    </View>
                  ))}

                  {/* Add meal button */}
                  <Pressable
                    testID={`add-meal-button-${dayTypeIndex}`}
                    onPress={() => dispatch({ type: 'ADD_MEAL', dayTypeIndex })}
                    accessibilityLabel="Add meal"
                    accessibilityRole="button"
                    className="rounded-xl bg-foreground/[.04] border border-dashed border-foreground/20 px-3 py-2 items-center"
                  >
                    <Text className="text-xs text-foreground/65">+ Add Meal</Text>
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
          <Text className="text-sm font-semibold text-foreground">
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </Button>
      </View>

      {/* Food Search Sheet Modal */}
      <Modal
        visible={pickerTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerTarget(null)}
      >
        <FoodSearchSheet
          onSelect={handleFoodSelect}
          onClose={() => setPickerTarget(null)}
        />
      </Modal>
    </Screen>
  );
}

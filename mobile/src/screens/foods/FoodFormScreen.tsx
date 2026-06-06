import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useFoodsStore } from '../../stores/foods.store';
import { createFood } from '../../lib/api/foods.api';
import { Food } from '../../types/nutrition-templates';
import { AppStackParamList } from '../../navigation/index';

type FoodFormRouteProp = RouteProp<AppStackParamList, 'FoodForm'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

interface FormState {
  name: string;
  brand: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
}

function buildInitialState(food?: Food): FormState {
  if (!food) {
    return { name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '' };
  }
  return {
    name: food.name,
    brand: food.brand ?? '',
    kcal: String(food.macrosPer100g.kcal),
    protein: String(food.macrosPer100g.protein),
    carbs: String(food.macrosPer100g.carbs),
    fat: String(food.macrosPer100g.fat),
  };
}

function isFormValid(state: FormState): boolean {
  if (state.name.trim().length === 0) return false;
  if (!Number.isFinite(parseFloat(state.kcal))) return false;
  if (!Number.isFinite(parseFloat(state.protein))) return false;
  if (!Number.isFinite(parseFloat(state.carbs))) return false;
  if (!Number.isFinite(parseFloat(state.fat))) return false;
  return true;
}

export function FoodFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FoodFormRouteProp>();
  const { food } = route.params ?? {};
  const insets = useSafeAreaInsets();

  const isEditMode = !!food;

  const addResult = useFoodsStore((s) => s.addResult);
  const update = useFoodsStore((s) => s.update);

  // food comes from route params and never changes during the screen lifetime — capture once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialState = useMemo(() => buildInitialState(food), []);
  const initialSnapshot = useMemo(() => JSON.stringify(initialState), [initialState]);

  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshot, [form, initialSnapshot]);
  const isValid = useMemo(() => isFormValid(form), [form]);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBack() {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      navigation.goBack();
    }
  }

  const handleSave = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const dto = {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        macrosPer100g: {
          kcal: parseFloat(form.kcal),
          protein: parseFloat(form.protein),
          carbs: parseFloat(form.carbs),
          fat: parseFloat(form.fat),
        },
        servings: food?.servings ?? [],
      };
      if (isEditMode && food) {
        await update(food._id, dto);
      } else {
        const created = await createFood(dto);
        addResult(created);
      }
      navigation.goBack();
    } catch {
      setSaving(false);
      setSaveError('Failed to save. Please try again.');
    }
  }, [form, isEditMode, isValid, saving, food, navigation, addResult, update]);

  return (
    <Screen testID="screen-FoodForm">
      <ScreenHeader
        title={isEditMode ? 'Edit Food' : 'New Food'}
        onBack={handleBack}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-4">
          {/* Name */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Name <Text className="text-destructive">*</Text>
            </Text>
            <TextInput
              testID="food-name-input"
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              placeholder="e.g. Chicken Breast"
              placeholderTextColor="rgba(255,255,255,0.4)"
              accessibilityLabel="Food name"
              className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            />
          </View>

          {/* Brand */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Brand{' '}
              <Text className="text-foreground/65 normal-case tracking-normal">(optional)</Text>
            </Text>
            <TextInput
              testID="food-brand-input"
              value={form.brand}
              onChangeText={(v) => setField('brand', v)}
              placeholder="e.g. FreshFarm"
              placeholderTextColor="rgba(255,255,255,0.4)"
              accessibilityLabel="Brand"
              className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            />
          </View>

          {/* Macros per 100g */}
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Macros per 100g
            </Text>

            <View className="flex-row gap-2">
              {/* kcal */}
              <View className="flex-1 gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Kcal <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="food-kcal-input"
                  value={form.kcal}
                  onChangeText={(v) => setField('kcal', v)}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="decimal-pad"
                  accessibilityLabel="Calories per 100g"
                  className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground text-center"
                />
              </View>

              {/* Protein */}
              <View className="flex-1 gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-emerald-300/80">
                  Protein <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="food-protein-input"
                  value={form.protein}
                  onChangeText={(v) => setField('protein', v)}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="decimal-pad"
                  accessibilityLabel="Protein per 100g"
                  className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground text-center"
                />
              </View>
            </View>

            <View className="flex-row gap-2">
              {/* Carbs */}
              <View className="flex-1 gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-amber-300/80">
                  Carbs <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="food-carbs-input"
                  value={form.carbs}
                  onChangeText={(v) => setField('carbs', v)}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="decimal-pad"
                  accessibilityLabel="Carbs per 100g"
                  className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground text-center"
                />
              </View>

              {/* Fat */}
              <View className="flex-1 gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-pink-300/80">
                  Fat <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="food-fat-input"
                  value={form.fat}
                  onChangeText={(v) => setField('fat', v)}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="decimal-pad"
                  accessibilityLabel="Fat per 100g"
                  className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground text-center"
                />
              </View>
            </View>
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
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          className="flex-1 py-3 rounded-xl bg-muted items-center"
        >
          <Text className="text-sm font-semibold text-foreground/65">Cancel</Text>
        </Pressable>
        <Pressable
          testID="food-save-button"
          onPress={handleSave}
          disabled={!isDirty || !isValid || saving}
          accessibilityLabel="Save food"
          accessibilityRole="button"
          accessibilityState={{ disabled: !isDirty || !isValid || saving }}
          className={`flex-1 py-3 rounded-xl items-center ${
            isDirty && isValid && !saving ? 'bg-primary' : 'bg-primary/30'
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text className="text-sm font-semibold text-foreground">Save</Text>
          )}
        </Pressable>
      </View>

      {/* Unsaved changes dialog */}
      <Modal
        visible={showDiscardDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiscardDialog(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full rounded-2xl bg-card ring-1 ring-foreground/10 p-5 gap-4">
            <Text className="text-[15px] font-semibold text-foreground">Discard changes?</Text>
            <Text className="text-[13px] text-foreground/65">
              Your unsaved changes will be lost.
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setShowDiscardDialog(false)}
                accessibilityLabel="Keep editing"
                accessibilityRole="button"
                className="flex-1 rounded-xl bg-muted py-3 items-center"
              >
                <Text className="text-sm font-semibold text-foreground/65">Keep editing</Text>
              </Pressable>
              <Pressable
                testID="food-discard-confirm"
                onPress={() => {
                  setShowDiscardDialog(false);
                  navigation.goBack();
                }}
                accessibilityLabel="Discard changes"
                accessibilityRole="button"
                className="flex-1 rounded-xl bg-destructive/10 py-3 items-center"
              >
                <Text className="text-sm font-semibold text-destructive">Discard</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

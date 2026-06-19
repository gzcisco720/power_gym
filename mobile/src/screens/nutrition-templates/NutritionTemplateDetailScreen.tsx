import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Button } from '~/components/ui/button';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  Dialog,
  DialogContent,
} from '../../components/ui/dialog';
import { DayTypeTabs } from './components/DayTypeTabs';
import { useNutritionTemplatesStore } from '../../stores/nutrition-templates.store';
import { dayTypeTotals } from '../../lib/nutrition-macros';
import { AppStackParamList } from '../../navigation/index';

type DetailRouteProp = RouteProp<AppStackParamList, 'NutritionTemplateDetail'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

export function NutritionTemplateDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRouteProp>();
  const { templateId, templateName } = route.params;

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const items = useNutritionTemplatesStore((s) => s.items);
  const removeTemplate = useNutritionTemplatesStore((s) => s.removeTemplate);

  const template = items.find((t) => t._id === templateId) ?? null;

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await removeTemplate(templateId);
      setDeleteDialogVisible(false);
      navigation.goBack();
    } catch {
      setIsDeleting(false);
      setErrorMsg('Failed to delete. Please try again.');
    }
  }

  function handleEdit() {
    navigation.navigate('NutritionTemplateForm', {
      templateId,
      templateName,
    });
  }

  if (!template) {
    return (
      <Screen testID="screen-NutritionTemplateDetail">
        <ScreenHeader title={templateName} onBack={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[13px] text-foreground/65">Template not found.</Text>
        </View>
      </Screen>
    );
  }

  const activeDayType = template.dayTypes[activeTabIndex] ?? null;

  return (
    <Screen testID="screen-NutritionTemplateDetail">
      <ScreenHeader
        title={template.name}
        onBack={() => navigation.goBack()}
        right={
          <View className="flex-row gap-2">
            <Button
              testID="template-edit-button"
              onPress={handleEdit}
              accessibilityLabel="Edit template"
              variant="ghost"
              size="sm"
              className="px-3 py-1.5 rounded-xl bg-primary/10"
            >
              <Text className="text-sm font-semibold text-primary-light">Edit</Text>
            </Button>
            <Button
              testID="template-delete-button"
              onPress={() => setDeleteDialogVisible(true)}
              accessibilityLabel="Delete template"
              variant="ghost"
              size="sm"
              className="px-3 py-1.5 rounded-xl bg-destructive/10"
            >
              <Text className="text-sm font-semibold text-destructive">Delete</Text>
            </Button>
          </View>
        }
      />

      {/* Day type tabs */}
      {template.dayTypes.length > 0 ? (
        <DayTypeTabs
          dayTypes={template.dayTypes.map((dt) => dt.name)}
          activeIndex={activeTabIndex}
          onTabPress={setActiveTabIndex}
        />
      ) : null}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-3">
          {template.dayTypes.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No day types added yet.
            </Text>
          ) : activeDayType ? (
            <>
              {/* Day type macro totals */}
              {activeDayType.meals.some((m) => m.items.length > 0) ? (
                <View className="flex-row gap-2">
                  {(() => {
                    const totals = dayTypeTotals(activeDayType);
                    return (
                      <>
                        <View className="flex-1 rounded-xl bg-primary/10 ring-1 ring-primary/20 p-3">
                          <Text className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
                            Kcal
                          </Text>
                          <Text className="mt-1 text-lg font-semibold text-foreground tabular-nums">
                            {totals.kcal}
                          </Text>
                        </View>
                        <View className="flex-1 rounded-xl bg-muted ring-1 ring-foreground/10 p-3">
                          <Text className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
                            Protein
                          </Text>
                          <Text className="mt-1 text-lg font-semibold text-foreground tabular-nums">
                            {totals.protein}g
                          </Text>
                        </View>
                        <View className="flex-1 rounded-xl bg-muted ring-1 ring-foreground/10 p-3">
                          <Text className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
                            Carbs
                          </Text>
                          <Text className="mt-1 text-lg font-semibold text-foreground tabular-nums">
                            {totals.carbs}g
                          </Text>
                        </View>
                        <View className="flex-1 rounded-xl bg-muted ring-1 ring-foreground/10 p-3">
                          <Text className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
                            Fat
                          </Text>
                          <Text className="mt-1 text-lg font-semibold text-foreground tabular-nums">
                            {totals.fat}g
                          </Text>
                        </View>
                      </>
                    );
                  })()}
                </View>
              ) : null}

              {/* Meals */}
              {activeDayType.meals.length === 0 ? (
                <Text className="text-[13px] text-foreground/65 text-center mt-4">
                  No meals added for this day type.
                </Text>
              ) : (
                activeDayType.meals.map((meal, mealIndex) => (
                  <View
                    key={mealIndex}
                    className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-2"
                  >
                    <Text className="text-sm font-semibold text-foreground">{meal.name}</Text>
                    {meal.items.length === 0 ? (
                      <Text className="text-xs text-foreground/65">No items.</Text>
                    ) : (
                      meal.items.map((item, itemIndex) => (
                        <View
                          key={itemIndex}
                          className="flex-row items-center justify-between py-0.5"
                        >
                          <Text
                            className="text-sm text-foreground flex-1"
                            numberOfLines={1}
                          >
                            {item.foodName}
                          </Text>
                          <View className="flex-row gap-2 ml-2">
                            <Text className="text-xs text-foreground/65 tabular-nums">
                              {item.quantityG}g
                            </Text>
                            <Text className="text-xs text-foreground/65 tabular-nums">
                              {item.kcal} kcal
                            </Text>
                            <Text className="text-xs text-foreground/65 tabular-nums">
                              {item.protein}g P
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                ))
              )}
            </>
          ) : null}

          {errorMsg ? (
            <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogVisible} onOpenChange={setDeleteDialogVisible}>
        <DialogContent>
          <Text className="text-[18px] font-semibold text-foreground mb-1">
            Delete template?
          </Text>
          <Text className="text-sm text-foreground/65 mb-4">This cannot be undone.</Text>
          <View className="flex-row gap-3">
            <Button
              onPress={() => setDeleteDialogVisible(false)}
              disabled={isDeleting}
              accessibilityLabel="Cancel delete"
              variant="ghost"
              className="flex-1 py-3 rounded-xl bg-muted items-center"
            >
              <Text className="text-sm font-semibold text-foreground/65">Cancel</Text>
            </Button>
            <Button
              testID="template-delete-confirm"
              onPress={handleDeleteConfirm}
              disabled={isDeleting}
              accessibilityLabel="Confirm delete"
              variant="ghost"
              className="flex-1 py-3 rounded-xl bg-destructive/10 items-center"
            >
              {isDeleting ? (
                <ActivityIndicator />
              ) : (
                <Text className="text-sm font-semibold text-destructive">Delete</Text>
              )}
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

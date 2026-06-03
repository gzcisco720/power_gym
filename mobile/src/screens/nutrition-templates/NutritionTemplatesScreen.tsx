import React, { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useNutritionTemplatesStore } from '../../stores/nutrition-templates.store';
import { NutritionTemplate } from '../../types/nutrition-templates';
import { dayTypeTotals } from '../../lib/nutrition-macros';
import { AppStackParamList } from '../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

export function NutritionTemplatesScreen() {
  const navigation = useNavigation<Nav>();
  const fetchTemplates = useNutritionTemplatesStore((s) => s.fetchTemplates);
  const items = useNutritionTemplatesStore((s) => s.items);
  const loading = useNutritionTemplatesStore((s) => s.loading);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = useCallback(() => {
    navigation.navigate('NutritionTemplateForm', {});
  }, [navigation]);

  const handleRowPress = useCallback(
    (template: NutritionTemplate) => {
      navigation.navigate('NutritionTemplateDetail', {
        templateId: template._id,
        templateName: template.name,
      });
    },
    [navigation],
  );

  return (
    <Screen testID="screen-NutritionTemplates">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Nutrition Templates
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">
            Manage your meal plan templates
          </Text>
        </View>
        <Pressable
          testID="templates-add-button"
          onPress={handleCreate}
          accessibilityLabel="Create nutrition template"
          accessibilityRole="button"
          className="rounded-lg bg-primary px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-foreground">+ Create</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-1.5">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <View key={i} className="rounded-xl bg-muted px-3 py-2 h-16 opacity-60" />
              ))}
            </>
          ) : items.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No templates yet. Tap + Create to add one.
            </Text>
          ) : (
            items.map((template) => {
              const dayCount = template.dayTypes.length;
              return (
                <Pressable
                  key={template._id}
                  testID={`template-card-${template._id}`}
                  onPress={() => handleRowPress(template)}
                  accessibilityLabel={template.name}
                  accessibilityRole="button"
                  className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-sm font-medium text-foreground flex-1"
                      numberOfLines={1}
                    >
                      {template.name}
                    </Text>
                    <Text className="text-xs text-foreground/65 ml-2">
                      {dayCount} {dayCount === 1 ? 'day type' : 'day types'}
                    </Text>
                  </View>
                  {template.dayTypes.length > 0 ? (
                    <View className="flex-row flex-wrap gap-1.5 mt-1">
                      {template.dayTypes.slice(0, 2).map((dt) => {
                        const totals = dayTypeTotals(dt);
                        return (
                          <View
                            key={dt.name}
                            className="flex-row gap-1 items-center rounded-lg bg-muted px-2 py-0.5"
                          >
                            <Text className="text-[10px] font-medium text-foreground/65">
                              {dt.name}
                            </Text>
                            <Text className="text-[10px] text-foreground/65 tabular-nums">
                              {totals.kcal} kcal
                            </Text>
                            <Text className="text-[10px] text-foreground/65 tabular-nums">
                              {totals.protein}g P
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

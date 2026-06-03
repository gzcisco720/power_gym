import React, { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useTrainingTemplatesStore } from '../../stores/training-templates.store';
import { PlanTemplate } from '../../types/training-templates';
import { AppStackParamList } from '../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

function totalExercises(template: PlanTemplate): number {
  return template.days.reduce((sum, d) => sum + d.exercises.length, 0);
}

export function TrainingTemplatesScreen() {
  const navigation = useNavigation<Nav>();
  const fetchTemplates = useTrainingTemplatesStore((s) => s.fetchTemplates);
  const items = useTrainingTemplatesStore((s) => s.items);
  const loading = useTrainingTemplatesStore((s) => s.loading);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = useCallback(() => {
    navigation.navigate('TrainingTemplateForm', {});
  }, [navigation]);

  const handleRowPress = useCallback(
    (template: PlanTemplate) => {
      navigation.navigate('TrainingTemplateDetail', {
        templateId: template._id,
        templateName: template.name,
      });
    },
    [navigation],
  );

  return (
    <Screen testID="screen-TrainingTemplates">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Training Templates
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">
            Manage your workout templates
          </Text>
        </View>
        <Pressable
          testID="templates-add-button"
          onPress={handleCreate}
          accessibilityLabel="Create template"
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
              const dayCount = template.days.length;
              const exerciseCount = totalExercises(template);
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
                    <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                      {template.name}
                    </Text>
                    <View className="flex-row gap-2 ml-2">
                      <Text className="text-xs text-foreground/65">
                        {dayCount} {dayCount === 1 ? 'day' : 'days'}
                      </Text>
                      <Text className="text-xs text-foreground/65">
                        {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
                      </Text>
                    </View>
                  </View>
                  {template.description ? (
                    <Text className="text-xs text-foreground/65 mt-0.5" numberOfLines={1}>
                      {template.description}
                    </Text>
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

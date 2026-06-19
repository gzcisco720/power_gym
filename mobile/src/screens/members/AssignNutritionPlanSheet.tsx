import React, { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Button } from '~/components/ui/button';
import { useNutritionTemplatesStore } from '../../stores/nutrition-templates.store';
import { assignNutritionPlan as apiAssignNutritionPlan } from '../../lib/api/nutrition.api';
import { ActiveNutritionPlan } from '../../types/nutrition';

interface AssignNutritionPlanSheetProps {
  testID?: string;
  memberId: string;
  onAssigned: (plan: ActiveNutritionPlan) => void;
  onClose: () => void;
}

export function AssignNutritionPlanSheet({
  testID,
  memberId,
  onAssigned,
  onClose,
}: AssignNutritionPlanSheetProps) {
  const fetchTemplates = useNutritionTemplatesStore((s) => s.fetchTemplates);
  const items = useNutritionTemplatesStore((s) => s.items);
  const loading = useNutritionTemplatesStore((s) => s.loading);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleTemplatePress = useCallback(
    async (templateId: string) => {
      const plan = await apiAssignNutritionPlan(memberId, templateId);
      onAssigned(plan);
      onClose();
    },
    [memberId, onAssigned, onClose],
  );

  return (
    <View testID={testID} className="flex-1">
      {/* Sheet header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] px-4 py-4">
        <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
          Assign Nutrition Plan
        </Text>
        <Button
          onPress={onClose}
          accessibilityLabel="Close"
          variant="ghost"
          size="sm"
        >
          <Text className="text-sm text-foreground/65">Cancel</Text>
        </Button>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-1.5">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <View key={i} className="rounded-xl bg-muted h-12 opacity-60" />
              ))}
            </>
          ) : items.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No nutrition templates available.
            </Text>
          ) : (
            items.map((template) => (
              <Pressable
                key={template._id}
                testID={`nutrition-template-result-${template.name}`}
                onPress={() => void handleTemplatePress(template._id)}
                accessibilityLabel={template.name}
                accessibilityRole="button"
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
              >
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {template.name}
                </Text>
                <Text className="text-xs text-foreground/65 mt-0.5" numberOfLines={1}>
                  {template.dayTypes.length}{' '}
                  {template.dayTypes.length === 1 ? 'day type' : 'day types'}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

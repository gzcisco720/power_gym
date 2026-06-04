import React, { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTrainingTemplatesStore } from '../../stores/training-templates.store';
import { assignPlan as apiAssignPlan } from '../../lib/api/training.api';

import { ActivePlan } from '../../types/training';

interface AssignPlanSheetProps {
  testID?: string;
  memberId: string;
  onAssigned: (plan: ActivePlan) => void;
  onClose: () => void;
}

export function AssignPlanSheet({ testID, memberId, onAssigned, onClose }: AssignPlanSheetProps) {
  const fetchTemplates = useTrainingTemplatesStore((s) => s.fetchTemplates);
  const items = useTrainingTemplatesStore((s) => s.items);
  const loading = useTrainingTemplatesStore((s) => s.loading);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleTemplatePress = useCallback(
    async (templateId: string) => {
      const plan = await apiAssignPlan(memberId, templateId);
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
          Assign Plan
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Text className="text-sm text-foreground/65">Cancel</Text>
        </Pressable>
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
              No training templates available.
            </Text>
          ) : (
            items.map((template) => (
              <Pressable
                key={template._id}
                testID={`template-result-${template.name}`}
                onPress={() => void handleTemplatePress(template._id)}
                accessibilityLabel={template.name}
                accessibilityRole="button"
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
              >
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {template.name}
                </Text>
                {template.description ? (
                  <Text className="text-xs text-foreground/65 mt-0.5" numberOfLines={1}>
                    {template.description}
                  </Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '../../components/ui/dialog';
import { useTrainingTemplatesStore } from '../../stores/training-templates.store';
import { AppStackParamList } from '../../navigation/index';

type DetailRouteProp = RouteProp<AppStackParamList, 'TrainingTemplateDetail'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

export function TrainingTemplateDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRouteProp>();
  const { templateId, templateName } = route.params;

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const items = useTrainingTemplatesStore((s) => s.items);
  const removeAndDelete = useTrainingTemplatesStore((s) => s.removeAndDelete);

  const template = items.find((t) => t._id === templateId) ?? null;

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await removeAndDelete(templateId);
      setDeleteDialogVisible(false);
      navigation.goBack();
    } catch {
      setIsDeleting(false);
      setErrorMsg('Failed to delete. Please try again.');
    }
  }

  function handleEdit() {
    navigation.navigate('TrainingTemplateForm', {
      templateId,
      templateName,
    });
  }

  if (!template) {
    return (
      <Screen testID="screen-TrainingTemplateDetail">
        <ScreenHeader title={templateName} onBack={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[13px] text-foreground/65">Template not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID="screen-TrainingTemplateDetail">
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

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-4">
          {template.description ? (
            <Text className="text-sm text-foreground/65">{template.description}</Text>
          ) : null}

          {template.days.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No days added yet.
            </Text>
          ) : (
            template.days.map((day) => (
              <View key={day.dayNumber} className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-2">
                <Text className="text-sm font-semibold text-foreground">{day.name}</Text>
                {day.exercises.length === 0 ? (
                  <Text className="text-xs text-foreground/65">No exercises.</Text>
                ) : (
                  day.exercises.map((ex, idx) => (
                    <View key={idx} className="flex-row items-center justify-between py-0.5">
                      <Text className="text-sm text-foreground flex-1" numberOfLines={1}>
                        {ex.exerciseName}
                      </Text>
                      <View className="flex-row gap-2 ml-2">
                        <Text className="text-xs text-foreground/65 tabular-nums">
                          {ex.sets} × {ex.repsMin}–{ex.repsMax}
                        </Text>
                        {ex.restSeconds !== null ? (
                          <Text className="text-xs text-foreground/65 tabular-nums">
                            {ex.restSeconds}s
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>
            ))
          )}

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
          <Text className="text-sm text-foreground/65 mb-4">
            This cannot be undone.
          </Text>
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

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConditionReport, EquipmentItem } from '../../../types/equipment';
import { fetchConditionReports, createConditionReport } from '../../../lib/api/equipment.api';

interface ConditionReportsTabProps {
  item: EquipmentItem;
}

export function ConditionReportsTab({ item }: ConditionReportsTabProps) {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<ConditionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!item.trackCondition) return;
    setLoading(true);
    fetchConditionReports(item._id)
      .then((data) => setReports(data))
      .catch(() => setErrorMsg('Failed to load reports.'))
      .finally(() => setLoading(false));
  }, [item._id, item.trackCondition]);

  if (!item.trackCondition) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-[13px] text-foreground/65 text-center">
          Enable condition tracking to use this feature.
        </Text>
      </View>
    );
  }

  async function handleSubmit() {
    if (!note.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const newReport = await createConditionReport(item._id, note.trim());
      setReports((prev) => [newReport, ...prev]);
      setNote('');
      setSuccessMsg('Report added');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg('Failed to add report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-3">
          {loading ? (
            <ActivityIndicator color="#4f46e5" />
          ) : reports.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No reports yet.
            </Text>
          ) : (
            reports.map((report, index) => (
              <View
                key={report._id}
                testID={index === 0 ? 'report-item-0' : `report-item-${index}`}
                className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
              >
                <Text className="text-sm text-foreground">{report.note}</Text>
                <Text className="mt-0.5 text-xs text-foreground/65">
                  {new Date(report.reportedAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}

          {successMsg ? (
            <Text className="text-sm text-emerald-300 text-center">{successMsg}</Text>
          ) : null}
          {errorMsg ? (
            <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Add report input */}
      <View
        className="border-t border-foreground/10 px-4 py-3 gap-2"
        style={{ paddingBottom: insets.bottom || 12 }}
      >
        <TextInput
          testID="report-note-input"
          value={note}
          onChangeText={setNote}
          placeholder="Add a condition note…"
          placeholderTextColor="#616161"
          className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
          multiline
        />
        <Pressable
          testID="report-submit"
          onPress={handleSubmit}
          disabled={!note.trim() || isSubmitting}
          accessibilityLabel="Submit condition report"
          accessibilityRole="button"
          accessibilityState={{ disabled: !note.trim() || isSubmitting }}
          className={`py-2.5 rounded-xl items-center ${
            note.trim() && !isSubmitting ? 'bg-primary' : 'bg-primary/40'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-foreground">Submit Report</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

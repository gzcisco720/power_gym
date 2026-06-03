import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Injury, Medication } from '../../../types/health';

interface MemberHealthTabProps {
  injuries: Injury[];
  medications: Medication[];
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MemberHealthTab({ injuries, medications }: MemberHealthTabProps) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-6">
        {/* Active injuries */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Active Injuries
          </Text>
          {injuries.length === 0 ? (
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 items-center">
              <Text className="text-[13px] text-foreground/65">None</Text>
            </View>
          ) : (
            injuries.map((injury) => (
              <View
                key={injury._id}
                testID={`member-injury-card-${injury._id}`}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-1"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                    {injury.title}
                  </Text>
                  <View className="bg-emerald-500/10 rounded-full px-2 py-0.5">
                    <Text className="text-[10px] font-medium text-emerald-300">Active</Text>
                  </View>
                </View>
                {(injury.bodyPart ?? injury.bodySide) ? (
                  <Text className="text-xs text-foreground/65">
                    {[injury.bodyPart, injury.bodySide].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                <Text className="text-xs text-foreground/65">
                  Recorded: {formatDate(injury.recordedAt)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Active medications */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Active Medications
          </Text>
          {medications.length === 0 ? (
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 items-center">
              <Text className="text-[13px] text-foreground/65">None</Text>
            </View>
          ) : (
            medications.map((med) => (
              <View
                key={med._id}
                testID={`member-medication-card-${med._id}`}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-1"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-foreground">{med.name}</Text>
                  <View className="bg-primary/10 rounded-full px-2 py-0.5">
                    <Text className="text-[10px] font-medium text-primary-light">
                      {med.duration === 'long_term' ? 'Long-term' : 'Short-term'}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-foreground/65">{med.purpose}</Text>
                <Text className="text-xs text-foreground/65">
                  Since: {formatDate(med.startDate)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';

const COLORS = { primary: '#4f46e5' } as const;
import { useTrainersStore } from '../../../stores/trainers.store';
import { TrainerMemberMetrics } from '../../../types/trainers';

interface TrainerMembersTabProps {
  trainerId: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function StatusBadge({ status }: { status: TrainerMemberMetrics['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-emerald-500/15', textClass: 'text-emerald-300' },
    'needs-attn': { label: 'Needs Attn', className: 'bg-amber-500/15', textClass: 'text-amber-300' },
    'no-plan': { label: 'No Plan', className: 'bg-foreground/10', textClass: 'text-foreground/65' },
  }[status];

  return (
    <View className={`rounded-full px-2 py-0.5 ${config.className}`}>
      <Text className={`text-[10px] font-medium ${config.textClass}`}>{config.label}</Text>
    </View>
  );
}

function ReassignMemberSheet({
  visible,
  member,
  currentTrainerId,
  onClose,
}: {
  visible: boolean;
  member: TrainerMemberMetrics | null;
  currentTrainerId: string;
  onClose: () => void;
}) {
  const trainers = useTrainersStore((s) => s.trainers);
  const fetchTrainers = useTrainersStore((s) => s.fetchTrainers);
  const reassignMember = useTrainersStore((s) => s.reassignMember);
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    if (visible) {
      void fetchTrainers();
    }
  }, [visible, fetchTrainers]);

  async function handleReassign(targetTrainerId: string) {
    if (!member) return;
    setReassigning(true);
    try {
      await reassignMember(currentTrainerId, member.id, targetTrainerId);
      onClose();
    } finally {
      setReassigning(false);
    }
  }

  const otherTrainers = trainers.filter((t) => t.id !== currentTrainerId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="reassign-member-sheet"
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-card rounded-t-2xl px-4 pt-4 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[16px] font-semibold text-foreground">
              Reassign {member?.name ?? ''}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close reassign sheet"
              className="px-2 py-1"
            >
              <Text className="text-sm text-foreground/65">Cancel</Text>
            </Pressable>
          </View>

          <Text className="text-xs text-foreground/65 mb-3">
            Select a trainer to reassign this member to:
          </Text>

          {reassigning ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : otherTrainers.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center py-4">
              No other trainers available.
            </Text>
          ) : (
            otherTrainers.map((trainer) => (
              <Pressable
                key={trainer.id}
                testID={`reassign-target-${trainer.id}`}
                onPress={() => { void handleReassign(trainer.id); }}
                accessibilityLabel={`Reassign to ${trainer.name}`}
                className="rounded-xl bg-muted px-3 py-3 mb-2"
              >
                <Text className="text-sm font-medium text-foreground">{trainer.name}</Text>
                <Text className="text-xs text-foreground/65">{trainer.email}</Text>
              </Pressable>
            ))
          )}
        </View>
      </View>
    </Modal>
  );
}

export function TrainerMembersTab({ trainerId }: TrainerMembersTabProps) {
  const trainerMembers = useTrainersStore((s) => s.trainerMembers) ?? [];
  const trainerMembersLoading = useTrainersStore((s) => s.trainerMembersLoading);
  const fetchTrainerMembers = useTrainersStore((s) => s.fetchTrainerMembers);

  const [reassignTarget, setReassignTarget] = useState<TrainerMemberMetrics | null>(null);

  useEffect(() => {
    void fetchTrainerMembers(trainerId);
  }, [fetchTrainerMembers, trainerId]);

  if (trainerMembersLoading) {
    return (
      <View className="px-4 py-4 gap-2">
        {[0, 1, 2].map((i) => (
          <View key={i} className="rounded-xl bg-muted h-14 opacity-60" />
        ))}
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-1.5">
          {trainerMembers.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No members assigned.
            </Text>
          ) : (
            trainerMembers.map((member) => (
              <View
                key={member.id}
                testID={`trainer-member-row-${member.id}`}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
              >
                <View className="flex-row items-center gap-3">
                  {/* Avatar */}
                  <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
                    <Text className="text-xs font-semibold text-primary-light">
                      {getInitials(member.name)}
                    </Text>
                  </View>

                  {/* Name + email */}
                  <View className="flex-1 gap-0.5">
                    <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                      {member.name}
                    </Text>
                    <Text className="text-xs text-foreground/65" numberOfLines={1}>
                      {member.email}
                    </Text>
                  </View>

                  <StatusBadge status={member.status} />
                </View>

                {/* Metrics row */}
                <View className="flex-row items-center gap-4 mt-2 pl-12">
                  <View className="flex-row items-center gap-1">
                    <Text className="text-xs font-semibold text-foreground">{member.streak}</Text>
                    <Text className="text-xs text-foreground/65">day streak</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-xs font-semibold text-foreground">
                      {member.sessionsThisMonth}
                    </Text>
                    <Text className="text-xs text-foreground/65">sessions/mo</Text>
                  </View>
                </View>

                {/* Reassign button */}
                <View className="flex-row justify-end mt-2">
                  <Pressable
                    testID={`reassign-member-${member.id}`}
                    onPress={() => setReassignTarget(member)}
                    accessibilityLabel={`Reassign ${member.name}`}
                    className="px-2 py-1 rounded-lg bg-muted"
                  >
                    <Text className="text-xs font-medium text-foreground/65">Reassign</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <ReassignMemberSheet
        visible={reassignTarget !== null}
        member={reassignTarget}
        currentTrainerId={trainerId}
        onClose={() => setReassignTarget(null)}
      />
    </>
  );
}

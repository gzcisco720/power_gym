import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useMembersStore } from '../../stores/members.store';
import { useTrainersStore } from '../../stores/trainers.store';
import { Member } from '../../types/members';
import { MemberCard } from './components/MemberCard';
import { ReassignTrainerSheet } from './components/ReassignTrainerSheet';
import { AppStackParamList } from '../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

export function MembersScreen() {
  const navigation = useNavigation<Nav>();

  const fetchMembers = useMembersStore((s) => s.fetchMembers);
  const loading = useMembersStore((s) => s.loading);
  const searchQuery = useMembersStore((s) => s.searchQuery);
  const setSearchQuery = useMembersStore((s) => s.setSearchQuery);
  const filteredMembers = useMembersStore((s) => s.filteredMembers);
  const trainerFilter = useMembersStore((s) => s.trainerFilter);
  const setTrainerFilter = useMembersStore((s) => s.setTrainerFilter);
  const assignTrainer = useMembersStore((s) => s.assignTrainer);
  const unassignTrainer = useMembersStore((s) => s.unassignTrainer);

  const trainers = useTrainersStore((s) => s.trainers);
  const fetchTrainers = useTrainersStore((s) => s.fetchTrainers);

  const [reassignMember, setReassignMember] = useState<Member | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<Member | null>(null);

  useEffect(() => {
    void fetchMembers();
    void fetchTrainers();
  }, [fetchMembers, fetchTrainers]);

  const baseMembers = filteredMembers();
  const members = trainerFilter
    ? baseMembers.filter((m) => m.trainerId === trainerFilter)
    : baseMembers;

  const handleCardPress = useCallback(
    (member: Member) => {
      navigation.navigate('MemberDetail', { memberId: member.id });
    },
    [navigation],
  );

  const handleReassignSelect = useCallback(
    async (trainerId: string) => {
      if (!reassignMember) return;
      await assignTrainer(reassignMember.id, trainerId);
      setReassignMember(null);
    },
    [reassignMember, assignTrainer],
  );

  const handleUnassignConfirm = useCallback(
    async (member: Member) => {
      await unassignTrainer(member.id);
      setUnassignTarget(null);
    },
    [unassignTrainer],
  );

  return (
    <Screen testID="screen-Members">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Members
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">Manage your members</Text>
        </View>
      </View>

      {/* Search bar */}
      <View className="px-4 py-3 border-b border-foreground/[.06]">
        <TextInput
          testID="members-search-input"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search members..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          accessibilityLabel="Search members"
          className="rounded-xl bg-input px-3 py-2 text-sm text-foreground"
        />
      </View>

      {/* Trainer filter chips */}
      {trainers.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-foreground/[.06]"
          contentContainerClassName="px-4 py-2 gap-2 flex-row"
        >
          <Pressable
            testID="trainer-filter-chip-all"
            onPress={() => setTrainerFilter(null)}
            accessibilityLabel="Show all members"
            accessibilityRole="button"
            className={`rounded-full px-3 py-1 ${trainerFilter === null ? 'bg-primary' : 'bg-muted'}`}
          >
            <Text className={`text-xs font-medium ${trainerFilter === null ? 'text-foreground' : 'text-foreground/65'}`}>
              All
            </Text>
          </Pressable>
          {trainers.map((trainer) => (
            <Pressable
              key={trainer.id}
              testID={`trainer-filter-chip-${trainer.id}`}
              onPress={() => setTrainerFilter(trainer.id)}
              accessibilityLabel={`Filter by ${trainer.name}`}
              accessibilityRole="button"
              className={`rounded-full px-3 py-1 ${trainerFilter === trainer.id ? 'bg-primary' : 'bg-muted'}`}
            >
              <Text className={`text-xs font-medium ${trainerFilter === trainer.id ? 'text-foreground' : 'text-foreground/65'}`}>
                {trainer.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-1.5">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <View key={i} className="rounded-xl bg-muted px-3 py-2 h-14 opacity-60" />
              ))}
            </>
          ) : members.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No members found.
            </Text>
          ) : (
            members.map((member) => (
              <View key={member.id} className="gap-1">
                <MemberCard member={member} onPress={handleCardPress} />
                <View className="flex-row gap-1.5 px-1">
                  <Pressable
                    testID={`reassign-btn-${member.id}`}
                    onPress={() => setReassignMember(member)}
                    accessibilityLabel={`Reassign ${member.name}`}
                    accessibilityRole="button"
                    className="flex-1 rounded-lg bg-muted px-3 py-1.5 items-center"
                  >
                    <Text className="text-xs font-medium text-foreground/65">Reassign</Text>
                  </Pressable>
                  {member.trainerId ? (
                    <Pressable
                      testID={`unassign-btn-${member.id}`}
                      onPress={() => setUnassignTarget(member)}
                      accessibilityLabel={`Unassign ${member.name}`}
                      accessibilityRole="button"
                      className="flex-1 rounded-lg bg-destructive/10 px-3 py-1.5 items-center"
                    >
                      <Text className="text-xs font-medium text-destructive">Unassign</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Reassign sheet modal */}
      <Modal
        visible={reassignMember !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReassignMember(null)}
      >
        {reassignMember !== null && (
          <ReassignTrainerSheet
            trainers={trainers}
            onSelect={(tid) => void handleReassignSelect(tid)}
            onClose={() => setReassignMember(null)}
          />
        )}
      </Modal>

      {/* Unassign confirmation */}
      {unassignTarget !== null && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setUnassignTarget(null)}
        >
          <View className="flex-1 justify-center items-center bg-background/80 px-6">
            <View className="w-full rounded-2xl bg-card ring-1 ring-foreground/10 p-5 gap-4">
              <Text className="text-[15px] font-semibold text-foreground">Unassign member?</Text>
              <Text className="text-[13px] text-foreground/65">
                {unassignTarget.name} will no longer have a trainer assigned.
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setUnassignTarget(null)}
                  accessibilityLabel="Cancel unassign"
                  accessibilityRole="button"
                  className="flex-1 rounded-xl bg-muted px-3 py-2.5 items-center"
                >
                  <Text className="text-sm font-medium text-foreground/65">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleUnassignConfirm(unassignTarget)}
                  accessibilityLabel="Confirm unassign"
                  accessibilityRole="button"
                  className="flex-1 rounded-xl bg-destructive/10 px-3 py-2.5 items-center"
                >
                  <Text className="text-sm font-medium text-destructive">Unassign</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

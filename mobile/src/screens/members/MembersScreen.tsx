import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
} from 'react-native';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type Option,
} from '~/components/ui/select';
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    void fetchMembers();
    void fetchTrainers();
  }, [fetchMembers, fetchTrainers]);

  const allMembers = useMembersStore((s) => s.members);
  const baseMembers = filteredMembers();
  const members = trainerFilter
    ? baseMembers.filter((m) => m.trainerId === trainerFilter)
    : baseMembers;

  const totalCount = allMembers.length;
  const unassignedCount = allMembers.filter((m) => !m.trainerId).length;

  const handleCardPress = useCallback(
    (member: Member) => {
      navigation.navigate('MemberDetail', { memberId: member.id });
    },
    [navigation],
  );

  const handleReassignSelect = useCallback(
    (trainerId: string) => {
      if (!reassignMember) return;
      void assignTrainer(reassignMember.id, trainerId);
      setReassignMember(null);
      showToast('Trainer assigned');
    },
    [reassignMember, assignTrainer, showToast],
  );

  const handleUnassignConfirm = useCallback(
    async (member: Member) => {
      await unassignTrainer(member.id);
      setUnassignTarget(null);
      showToast('Member unassigned');
    },
    [unassignTrainer, showToast],
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

      {/* Stats strip */}
      <View className="flex-row px-4 py-2 gap-4 border-b border-foreground/[.06]">
        <View className="flex-row items-center gap-1.5">
          <Text
            testID="stats-total-members"
            className="text-sm font-semibold text-foreground tabular-nums"
          >
            {String(totalCount)}
          </Text>
          <Text className="text-xs text-foreground/65">Total</Text>
        </View>
        {unassignedCount > 0 && (
          <View className="flex-row items-center gap-1.5">
            <Text
              testID="stats-unassigned"
              className="text-sm font-semibold text-amber-300 tabular-nums"
            >
              {String(unassignedCount)}
            </Text>
            <Text className="text-xs text-foreground/65">Unassigned</Text>
          </View>
        )}
      </View>

      {/* Search bar */}
      <View className="px-4 py-3 border-b border-foreground/[.06]">
        <Input
          testID="members-search-input"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search members..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          accessibilityLabel="Search members"
          className="rounded-xl bg-input px-3 py-2 text-sm text-foreground"
        />
      </View>

      {/* Trainer filter */}
      {trainers.length > 0 && (
        <View className="px-4 py-2 border-b border-foreground/[.06]">
          <Select
            value={trainerFilter ? { value: trainerFilter, label: trainers.find((t) => t.id === trainerFilter)?.name ?? '' } : undefined}
            onValueChange={(opt: Option | undefined) => setTrainerFilter(opt?.value || null)}
          >
            <SelectTrigger testID="trainer-filter-select" className="bg-input border-none rounded-xl px-3">
              <SelectValue placeholder="All trainers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" label="All trainers" />
              {trainers.map((t) => (
                <SelectItem key={t.id} value={t.id} label={t.name} />
              ))}
            </SelectContent>
          </Select>
        </View>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-1.5">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} testID="skeleton-row" className="rounded-xl h-14" />
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
                  <Button
                    testID={`reassign-btn-${member.id}`}
                    onPress={() => setReassignMember(member)}
                    accessibilityLabel={`Reassign ${member.name}`}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    <Text className="text-xs font-medium text-foreground/65">Reassign</Text>
                  </Button>
                  {member.trainerId ? (
                    <Button
                      testID={`unassign-btn-${member.id}`}
                      onPress={() => setUnassignTarget(member)}
                      accessibilityLabel={`Unassign ${member.name}`}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      <Text className="text-xs font-medium text-destructive">Unassign</Text>
                    </Button>
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

      {/* Toast feedback */}
      {toastMessage !== null && (
        <View
          pointerEvents="none"
          className="absolute bottom-8 left-0 right-0 items-center px-6"
        >
          <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-2.5">
            <Text testID="toast-message" className="text-sm font-medium text-foreground">
              {toastMessage}
            </Text>
          </View>
        </View>
      )}

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
                <Button
                  onPress={() => setUnassignTarget(null)}
                  accessibilityLabel="Cancel unassign"
                  variant="secondary"
                  className="flex-1"
                >
                  <Text className="text-sm font-medium text-foreground/65">Cancel</Text>
                </Button>
                <Button
                  onPress={() => void handleUnassignConfirm(unassignTarget)}
                  accessibilityLabel="Confirm unassign"
                  variant="destructive"
                  className="flex-1"
                >
                  <Text className="text-sm font-medium text-destructive">Unassign</Text>
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

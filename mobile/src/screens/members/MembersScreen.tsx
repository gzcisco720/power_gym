import React, { useCallback, useEffect } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useMembersStore } from '../../stores/members.store';
import { Member } from '../../types/members';
import { MemberCard } from './components/MemberCard';
import { AppStackParamList } from '../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

export function MembersScreen() {
  const navigation = useNavigation<Nav>();
  const fetchMembers = useMembersStore((s) => s.fetchMembers);
  const loading = useMembersStore((s) => s.loading);
  const searchQuery = useMembersStore((s) => s.searchQuery);
  const setSearchQuery = useMembersStore((s) => s.setSearchQuery);
  const filteredMembers = useMembersStore((s) => s.filteredMembers);
  const members = filteredMembers();

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const handleCardPress = useCallback(
    (member: Member) => {
      navigation.navigate('MemberDetail', { memberId: member.id });
    },
    [navigation],
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
              <MemberCard key={member.id} member={member} onPress={handleCardPress} />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

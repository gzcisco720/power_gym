import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { TrainerMember } from '../../../types/trainers';
import { MemberRow } from '../../members/components/MemberRow';

interface TrainerMembersTabProps {
  members: TrainerMember[];
}

export function TrainerMembersTab({ members }: TrainerMembersTabProps) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-1.5">
        {members.length === 0 ? (
          <Text className="text-[13px] text-foreground/65 text-center mt-4">
            No members assigned.
          </Text>
        ) : (
          members.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

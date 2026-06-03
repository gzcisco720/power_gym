import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Member } from '../../../types/members';

interface MemberCardProps {
  member: Member;
  onPress: (member: Member) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export function MemberCard({ member, onPress }: MemberCardProps) {
  const initials = getInitials(member.name);

  return (
    <Pressable
      testID={`member-card-${member.id}`}
      onPress={() => onPress(member)}
      accessibilityLabel={`Member ${member.name}`}
      accessibilityRole="button"
      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center gap-3"
    >
      {/* Avatar initials */}
      <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
        <Text className="text-xs font-semibold text-primary-light">{initials}</Text>
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

      {/* Trainer assignment */}
      {member.trainerName ? (
        <Text className="text-xs text-foreground/65" numberOfLines={1}>
          {member.trainerName}
        </Text>
      ) : null}
    </Pressable>
  );
}

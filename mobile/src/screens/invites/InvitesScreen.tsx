import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../../components/Screen';
import { useInvitesStore } from '../../stores/invites.store';
import { useAuthStore } from '../../stores/auth.store';
import { revokeInvite } from '../../lib/api/invites.api';
import { Invite, InviteStatus } from '../../types/invites';
import { inviteStatus } from '../../lib/invite-status';
import { CreateInviteBottomSheet } from './CreateInviteBottomSheet';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: InviteStatus }) {
  if (status === 'pending') {
    return (
      <View className="bg-emerald-500/15 rounded-full px-2 py-0.5">
        <Text className="text-[10px] font-medium text-emerald-300">Pending</Text>
      </View>
    );
  }
  if (status === 'expired') {
    return (
      <View className="bg-muted rounded-full px-2 py-0.5">
        <Text className="text-[10px] font-medium text-foreground/35">Expired</Text>
      </View>
    );
  }
  return (
    <View className="bg-primary/15 rounded-full px-2 py-0.5">
      <Text className="text-[10px] font-medium text-primary-light">Used</Text>
    </View>
  );
}

function RoleBadge({ role }: { role: 'trainer' | 'member' }) {
  return (
    <View className="bg-muted rounded-full px-2 py-0.5">
      <Text className="text-[10px] font-medium text-foreground/65 capitalize">{role}</Text>
    </View>
  );
}

interface InviteCardProps {
  invite: Invite;
  onRevoke: (invite: Invite) => void;
  copiedId: string | null;
  onCopy: (invite: Invite) => void;
}

function InviteCard({ invite, onRevoke, copiedId, onCopy }: InviteCardProps) {
  const status = inviteStatus(invite);
  const isPending = status === 'pending';

  return (
    <View
      testID={`invite-card-${invite._id}`}
      className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 gap-1.5"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-[14px] font-semibold text-foreground flex-1 mr-2" numberOfLines={1}>
          {invite.recipientEmail}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <RoleBadge role={invite.role} />
          <StatusBadge status={status} />
        </View>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] text-foreground/65">
          {status === 'used' && invite.usedAt
            ? `Used ${formatDate(invite.usedAt)}`
            : `Expires ${formatDate(invite.expiresAt)}`}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            testID={`invite-copy-${invite._id}`}
            onPress={() => onCopy(invite)}
            accessibilityLabel={`Copy invite link for ${invite.recipientEmail}`}
            accessibilityRole="button"
          >
            <Text className="text-[12px] text-primary-light">
              {copiedId === invite._id ? 'Copied!' : 'Copy link'}
            </Text>
          </Pressable>
          {isPending && (
            <Pressable
              testID={`invite-revoke-${invite._id}`}
              onPress={() => onRevoke(invite)}
              accessibilityLabel={`Revoke invite for ${invite.recipientEmail}`}
              accessibilityRole="button"
            >
              <Text className="text-[12px] text-destructive">Revoke</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export function InvitesScreen() {
  const { items, loading, fetchInvites, fetchTrainers, removeItem } = useInvitesStore();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'member';

  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Invite | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    void fetchInvites();
    if (role === 'owner') {
      void fetchTrainers();
    }
  }, [fetchInvites, fetchTrainers, role]);

  async function handleCopy(invite: Invite) {
    const link = `https://app.powergym.com/join?token=${invite.token}`;
    await Clipboard.setStringAsync(link);
    setCopiedId(invite._id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleRevokeConfirm() {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      await revokeInvite(revokeTarget._id);
      removeItem(revokeTarget._id);
    } finally {
      setIsRevoking(false);
      setRevokeTarget(null);
    }
  }

  const pending = items.filter((inv) => inviteStatus(inv) === 'pending');
  const expired = items.filter((inv) => inviteStatus(inv) === 'expired');
  const used = items.filter((inv) => inviteStatus(inv) === 'used');

  function renderSection(title: string, sectionItems: Invite[]) {
    if (sectionItems.length === 0) return null;
    return (
      <View className="gap-2">
        <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
          {title}
        </Text>
        {sectionItems.map((inv) => (
          <InviteCard
            key={inv._id}
            invite={inv}
            onRevoke={setRevokeTarget}
            copiedId={copiedId}
            onCopy={handleCopy}
          />
        ))}
      </View>
    );
  }

  return (
    <Screen testID="screen-Invites">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Invites
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">Manage pending invitations</Text>
        </View>
        <Pressable
          testID="invites-create-button"
          onPress={() => setCreateSheetVisible(true)}
          accessibilityLabel="Create invite"
          accessibilityRole="button"
          className="rounded-xl bg-primary px-3 py-2"
        >
          <Text className="text-sm font-semibold text-foreground">+ Create Invite</Text>
        </Pressable>
      </View>

      {/* List */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-6">
          {loading ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} className="rounded-xl bg-muted px-3 py-2 h-14 opacity-60" />
              ))}
            </>
          ) : items.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-8">
              No invites sent yet.
            </Text>
          ) : (
            <>
              {renderSection('Pending', pending)}
              {renderSection('Expired', expired)}
              {renderSection('Used', used)}
            </>
          )}
        </View>
      </ScrollView>

      {/* Create invite bottom sheet */}
      <CreateInviteBottomSheet
        visible={createSheetVisible}
        onClose={() => setCreateSheetVisible(false)}
      />

      {/* Revoke confirmation modal */}
      <Modal
        visible={revokeTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRevokeTarget(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="rounded-2xl bg-card px-5 py-5 gap-4 w-full">
            <Text className="text-[18px] font-semibold text-foreground">Revoke Invite</Text>
            <Text className="text-sm text-foreground/65">
              This will permanently revoke the invite for{' '}
              <Text className="text-foreground">{revokeTarget?.recipientEmail}</Text>.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                testID="invite-revoke-cancel"
                onPress={() => setRevokeTarget(null)}
                accessibilityLabel="Cancel revoke"
                accessibilityRole="button"
                className="flex-1 py-3 rounded-xl bg-muted items-center"
              >
                <Text className="text-sm font-semibold text-foreground/65">Cancel</Text>
              </Pressable>
              <Pressable
                testID="invite-revoke-confirm"
                onPress={handleRevokeConfirm}
                disabled={isRevoking}
                accessibilityLabel="Confirm revoke"
                accessibilityRole="button"
                className="flex-1 py-3 rounded-xl bg-destructive/10 items-center"
              >
                {isRevoking ? (
                  <ActivityIndicator color="#ef4444" />
                ) : (
                  <Text className="text-sm font-semibold text-destructive">Revoke</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

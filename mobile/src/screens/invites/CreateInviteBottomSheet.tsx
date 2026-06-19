import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInvitesStore } from '../../stores/invites.store';
import { useAuthStore } from '../../stores/auth.store';
import { createInvite } from '../../lib/api/invites.api';
import { InviteRole } from '../../types/invites';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type Option,
} from '~/components/ui/select';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface CreateInviteBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateInviteBottomSheet({ visible, onClose }: CreateInviteBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'member';
  const trainers = useInvitesStore((s) => s.trainers);
  const addItem = useInvitesStore((s) => s.addItem);

  const isOwner = role === 'owner';

  const defaultRole: Option = isOwner
    ? { value: 'trainer', label: 'Trainer' }
    : { value: 'member', label: 'Member' };

  const [selectedRole, setSelectedRole] = useState<Option | undefined>(defaultRole);
  const [email, setEmail] = useState('');
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inviteRole = (selectedRole?.value ?? 'member') as InviteRole;
  const needsTrainer = isOwner && inviteRole === 'member';
  const canSave =
    isValidEmail(email) &&
    (!needsTrainer || trainerId !== null);

  function handleClose() {
    setSelectedRole(defaultRole);
    setEmail('');
    setTrainerId(null);
    setErrorMsg(null);
    onClose();
  }

  function handleRoleChange(option: Option | undefined) {
    setSelectedRole(option);
    setTrainerId(null);
  }

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const dto = {
        role: inviteRole,
        recipientEmail: email.trim(),
        ...(needsTrainer && trainerId ? { trainerId } : {}),
      };
      const created = await createInvite(dto);
      addItem(created);
      handleClose();
    } catch {
      setErrorMsg('Failed to create invite. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View
          className="rounded-t-2xl bg-card"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Sheet header */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-foreground/[.06]">
            <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
              Create Invite
            </Text>
            <Button
              testID="invite-sheet-cancel"
              variant="ghost"
              size="sm"
              onPress={handleClose}
              accessibilityLabel="Cancel"
            >
              <Text className="text-sm text-foreground/65">Cancel</Text>
            </Button>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="px-4 py-4 gap-4">
              {/* Role picker — owner sees Select; trainer sees fixed Member label */}
              {isOwner ? (
                <View className="gap-1.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                    Role <Text className="text-destructive">*</Text>
                  </Text>
                  <Select value={selectedRole} onValueChange={handleRoleChange}>
                    <SelectTrigger testID="invite-role-select-trigger" className="bg-input border-none rounded-xl px-3">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trainer" label="Trainer" />
                      <SelectItem value="member" label="Member" />
                    </SelectContent>
                  </Select>
                </View>
              ) : (
                <View className="gap-1.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                    Role
                  </Text>
                  <View
                    testID="invite-role-member"
                    className="py-2.5 rounded-xl items-center border border-primary bg-primary/10"
                  >
                    <Text className="text-sm font-semibold text-primary-light">Member</Text>
                  </View>
                </View>
              )}

              {/* Email input */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Recipient Email <Text className="text-destructive">*</Text>
                </Text>
                <Input
                  testID="invite-email-input"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Recipient email"
                />
              </View>

              {/* Trainer picker — owner+member only */}
              {needsTrainer && (
                <View className="gap-1.5" testID="invite-trainer-picker">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                    Assign to Trainer <Text className="text-destructive">*</Text>
                  </Text>
                  <View className="gap-1.5">
                    {trainers.map((t) => (
                      <Button
                        key={t._id}
                        testID={`invite-trainer-option-${t._id}`}
                        variant={trainerId === t._id ? 'default' : 'outline'}
                        onPress={() => setTrainerId(t._id)}
                        accessibilityLabel={`Assign to ${t.name}`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            trainerId === t._id ? 'text-primary-foreground' : 'text-foreground/65'
                          }`}
                        >
                          {t.name}
                        </Text>
                      </Button>
                    ))}
                    {trainers.length === 0 && (
                      <Text className="text-xs text-foreground/65">No trainers available.</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Error feedback */}
              {errorMsg ? (
                <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
              ) : null}
            </View>
          </ScrollView>

          {/* Footer action bar */}
          <View className="px-4 py-3 border-t border-foreground/10 bg-background/95">
            <Button
              testID="invite-save-button"
              onPress={handleSave}
              disabled={!canSave || isSaving}
              accessibilityLabel="Save invite"
              accessibilityState={{ disabled: !canSave || isSaving }}
            >
              <Text className="text-sm font-semibold text-foreground">Send Invite</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInvitesStore } from '../../stores/invites.store';
import { useAuthStore } from '../../stores/auth.store';
import { createInvite } from '../../lib/api/invites.api';
import { InviteRole } from '../../types/invites';

const COLORS = { white: '#ffffff' } as const;

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

  const [selectedRole, setSelectedRole] = useState<InviteRole>(isOwner ? 'trainer' : 'member');
  const [email, setEmail] = useState('');
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const needsTrainer = isOwner && selectedRole === 'member';
  const canSave =
    isValidEmail(email) &&
    (!needsTrainer || trainerId !== null);

  function handleClose() {
    setSelectedRole(isOwner ? 'trainer' : 'member');
    setEmail('');
    setTrainerId(null);
    setErrorMsg(null);
    onClose();
  }

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const dto = {
        role: selectedRole,
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
            <Pressable
              testID="invite-sheet-cancel"
              onPress={handleClose}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text className="text-sm text-foreground/65">Cancel</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="px-4 py-4 gap-4">
              {/* Role picker — owner sees both; trainer sees member only */}
              {isOwner && (
                <View className="gap-1.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                    Role <Text className="text-destructive">*</Text>
                  </Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      testID="invite-role-trainer"
                      onPress={() => {
                        setSelectedRole('trainer');
                        setTrainerId(null);
                      }}
                      accessibilityLabel="Trainer role"
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedRole === 'trainer' }}
                      className={`flex-1 py-2.5 rounded-xl items-center border ${
                        selectedRole === 'trainer'
                          ? 'border-primary bg-primary/10'
                          : 'border-foreground/10 bg-muted'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          selectedRole === 'trainer' ? 'text-primary-light' : 'text-foreground/65'
                        }`}
                      >
                        Trainer
                      </Text>
                    </Pressable>
                    <Pressable
                      testID="invite-role-member"
                      onPress={() => setSelectedRole('member')}
                      accessibilityLabel="Member role"
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedRole === 'member' }}
                      className={`flex-1 py-2.5 rounded-xl items-center border ${
                        selectedRole === 'member'
                          ? 'border-primary bg-primary/10'
                          : 'border-foreground/10 bg-muted'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          selectedRole === 'member' ? 'text-primary-light' : 'text-foreground/65'
                        }`}
                      >
                        Member
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Trainer sees only Member label, no picker */}
              {!isOwner && (
                <View className="gap-1.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                    Role
                  </Text>
                  <Pressable
                    testID="invite-role-member"
                    accessibilityLabel="Member role"
                    accessibilityRole="radio"
                    accessibilityState={{ selected: true }}
                    className="py-2.5 rounded-xl items-center border border-primary bg-primary/10"
                  >
                    <Text className="text-sm font-semibold text-primary-light">Member</Text>
                  </Pressable>
                </View>
              )}

              {/* Email input */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Recipient Email <Text className="text-destructive">*</Text>
                </Text>
                <TextInput
                  testID="invite-email-input"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  className="bg-input rounded-xl px-3 py-2 text-sm text-foreground"
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
                      <Pressable
                        key={t._id}
                        testID={`invite-trainer-option-${t._id}`}
                        onPress={() => setTrainerId(t._id)}
                        accessibilityLabel={`Assign to ${t.name}`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: trainerId === t._id }}
                        className={`px-3 py-2.5 rounded-xl border ${
                          trainerId === t._id
                            ? 'border-primary bg-primary/10'
                            : 'border-foreground/10 bg-muted'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            trainerId === t._id ? 'text-primary-light' : 'text-foreground/65'
                          }`}
                        >
                          {t.name}
                        </Text>
                      </Pressable>
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
            <Pressable
              testID="invite-save-button"
              onPress={handleSave}
              disabled={!canSave || isSaving}
              accessibilityLabel="Save invite"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave || isSaving }}
              className={`py-3 rounded-xl items-center ${
                canSave && !isSaving ? 'bg-primary' : 'bg-primary/40'
              }`}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text className="text-sm font-semibold text-foreground">Send Invite</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

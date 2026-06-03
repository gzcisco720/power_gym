import { Invite, InviteStatus } from '../types/invites';

export function inviteStatus(invite: Invite, now: Date = new Date()): InviteStatus {
  if (invite.usedAt !== null) {
    return 'used';
  }
  if (new Date(invite.expiresAt) <= now) {
    return 'expired';
  }
  return 'pending';
}

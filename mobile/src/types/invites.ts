export type InviteRole = 'trainer' | 'member';

export type InviteStatus = 'pending' | 'expired' | 'used';

export interface Invite {
  _id: string;
  token: string;
  role: InviteRole;
  recipientEmail: string;
  expiresAt: string;
  usedAt: string | null;
  trainerId: string | null;
  invitedBy: string;
}

export interface CreateInviteDto {
  role: InviteRole;
  recipientEmail: string;
  trainerId?: string;
}

export interface TrainerOption {
  _id: string;
  name: string;
}

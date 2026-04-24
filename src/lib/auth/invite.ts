import crypto from 'crypto';
import type { IInviteToken } from '@/lib/db/models/invite-token.model';
import type { IInviteRepository } from '@/lib/repositories/invite.repository';

interface CreateInviteParams {
  role: 'trainer' | 'member';
  invitedBy: string;
  recipientEmail: string;
  trainerId?: string;
}

type ValidationResult =
  | { valid: false; reason: 'not-found' | 'already-used' | 'expired' }
  | { valid: true; invite: IInviteToken };

export async function createInviteToken(
  params: CreateInviteParams,
  repo: IInviteRepository,
): Promise<IInviteToken> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  return repo.create({
    token,
    role: params.role,
    invitedBy: params.invitedBy,
    recipientEmail: params.recipientEmail.toLowerCase(),
    expiresAt,
    trainerId: params.trainerId,
  });
}

export function validateInviteToken(invite: IInviteToken | null): ValidationResult {
  if (!invite) return { valid: false, reason: 'not-found' };
  if (invite.usedAt) return { valid: false, reason: 'already-used' };
  if (invite.expiresAt < new Date()) return { valid: false, reason: 'expired' };
  return { valid: true, invite };
}

import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

export function requireTrainerOrOwner(role: UserRole): Response | null {
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export function buildInviteUrl(token: string): string {
  return `${process.env.AUTH_URL ?? 'http://localhost:3000'}/register?token=${token}`;
}

export function checkTemplateOwnership(
  template: { createdBy: { toString(): string } },
  userId: string,
  role: UserRole,
): Response | null {
  if (role !== 'owner' && template.createdBy.toString() !== userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function assertTrainerOwnsMember(
  trainerId: string,
  memberId: string,
): Promise<Response | null> {
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
  if (member.trainerId?.toString() !== trainerId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

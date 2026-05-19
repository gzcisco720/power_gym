import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UpdateInjuryData } from '@/lib/repositories/member-injury.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string; id: string }> };

const MEMBER_ALLOWED_FIELDS = new Set([
  'memberNotes', 'painAtRest', 'painDuringExercise', 'mechanism',
  'aggravatingFactors', 'relievingFactors', 'seenDoctor', 'status', 'resolvedAt',
]);

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId, id } = await params;
  const role = session.user.role as UserRole;

  let body: UpdateInjuryData & { resolvedAt?: string | null };
  try {
    body = (await req.json()) as UpdateInjuryData & { resolvedAt?: string | null };
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await connectDB();
  const injuryRepo = new MongoMemberInjuryRepository();

  if (role === 'member') {
    const injury = await injuryRepo.findById(id);
    if (!injury) return Response.json({ error: 'Not found' }, { status: 404 });
    if (injury.memberId.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const keys = Object.keys(body);
    const hasDisallowed = keys.some((k) => !MEMBER_ALLOWED_FIELDS.has(k));
    if (hasDisallowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const updateData: UpdateInjuryData = {};
    for (const k of keys) {
      if (MEMBER_ALLOWED_FIELDS.has(k)) {
        (updateData as Record<string, unknown>)[k] = (body as Record<string, unknown>)[k];
      }
    }
    if (updateData.status === 'resolved' && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (updateData.status === 'active') {
      updateData.resolvedAt = null;
    }

    const updated = await injuryRepo.update(id, updateData);
    return Response.json(updated);
  }

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { memberNotes: _mn, ...trainerBody } = body as UpdateInjuryData & { memberNotes?: unknown };
  void _mn;

  const finalUpdate = { ...trainerBody } as UpdateInjuryData;
  if (finalUpdate.status === 'resolved' && !finalUpdate.resolvedAt) {
    finalUpdate.resolvedAt = new Date();
  }
  if (finalUpdate.status === 'active') {
    finalUpdate.resolvedAt = null;
  }

  const updated = await injuryRepo.update(id, finalUpdate);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId, id } = await params;
  const role = session.user.role as UserRole;

  await connectDB();
  const injuryRepo = new MongoMemberInjuryRepository();

  if (role === 'member') {
    const injury = await injuryRepo.findById(id);
    if (!injury) return Response.json({ error: 'Not found' }, { status: 404 });
    if (injury.memberId.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (injury.createdByRole !== 'member') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    await injuryRepo.deleteById(id);
    return new Response(null, { status: 204 });
  }

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  await injuryRepo.deleteById(id);
  return new Response(null, { status: 204 });
}

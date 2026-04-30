import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UpdateInjuryData } from '@/lib/repositories/member-injury.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string; id: string }> };

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId, id } = await params;
  const role = session.user.role as UserRole;

  let body: UpdateInjuryData & { memberNotes?: string | null };
  try {
    body = (await req.json()) as UpdateInjuryData;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await connectDB();
  const injuryRepo = new MongoMemberInjuryRepository();

  if (role === 'member') {
    const hasDisallowedFields = Object.keys(body).some((k) => k !== 'memberNotes');
    if (hasDisallowedFields) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const injury = await injuryRepo.findById(id);
    if (!injury) return Response.json({ error: 'Not found' }, { status: 404 });
    if (injury.memberId.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await injuryRepo.update(id, { memberNotes: body.memberNotes ?? null });
    return Response.json(updated);
  }

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const updated = await injuryRepo.update(id, body);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId, id } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  await new MongoMemberInjuryRepository().deleteById(id);
  return new Response(null, { status: 204 });
}

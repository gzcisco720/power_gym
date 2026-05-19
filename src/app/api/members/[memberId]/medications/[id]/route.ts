import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberMedicationRepository } from '@/lib/repositories/member-medication.repository';
import type { UpdateMedicationData } from '@/lib/repositories/member-medication.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string; id: string }> };

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const role = session.user.role as UserRole;

  if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: UpdateMedicationData;
  try { body = (await req.json()) as UpdateMedicationData; } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoMemberMedicationRepository();
  const med = await repo.findById(id);
  if (!med) return Response.json({ error: 'Not found' }, { status: 404 });
  if (med.memberId.toString() !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const updated = await repo.update(id, body);
  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const role = session.user.role as UserRole;

  if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const repo = new MongoMemberMedicationRepository();
  const med = await repo.findById(id);
  if (!med) return Response.json({ error: 'Not found' }, { status: 404 });
  if (med.memberId.toString() !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  await repo.deleteById(id);
  return new Response(null, { status: 204 });
}

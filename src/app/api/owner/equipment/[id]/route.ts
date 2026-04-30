import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoEquipmentRepository } from '@/lib/repositories/equipment.repository';
import type { UpdateEquipmentData } from '@/lib/repositories/equipment.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const item = await new MongoEquipmentRepository().findById(id);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(item);
}

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: UpdateEquipmentData;
  try {
    body = (await req.json()) as UpdateEquipmentData;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  await connectDB();
  const updated = await new MongoEquipmentRepository().update(id, body);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await connectDB();
  await new MongoEquipmentRepository().deleteById(id);
  return new Response(null, { status: 204 });
}

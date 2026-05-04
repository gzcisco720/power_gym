import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoEquipmentRepository } from '@/lib/repositories/equipment.repository';
import type { EquipmentStatus } from '@/lib/db/models/equipment.model';
import type { UserRole } from '@/types/auth';

interface EquipmentPayload {
  name: string;
  status?: EquipmentStatus;
  brand?: string | null;
  quantity?: number;
  images?: string[];
  note?: string | null;
  trackCondition?: boolean;
}

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const items = await new MongoEquipmentRepository().findAll();
  return Response.json(items);
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.role as UserRole;
  if (role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: EquipmentPayload;
  try {
    body = (await req.json()) as EquipmentPayload;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 });

  await connectDB();
  const item = await new MongoEquipmentRepository().create({
    name: body.name.trim(),
    status: body.status ?? 'active',
    brand: body.brand?.trim() ?? null,
    quantity: body.quantity ?? 1,
    images: body.images ?? [],
    note: body.note?.trim() ?? null,
    trackCondition: body.trackCondition ?? false,
  });
  return Response.json(item, { status: 201 });
}

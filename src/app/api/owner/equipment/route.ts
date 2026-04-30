import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoEquipmentRepository } from '@/lib/repositories/equipment.repository';
import type { EquipmentCategory, EquipmentStatus } from '@/lib/db/models/equipment.model';
import type { UserRole } from '@/types/auth';

interface EquipmentPayload {
  name: string;
  category?: EquipmentCategory;
  quantity?: number;
  status?: EquipmentStatus;
  purchasedAt?: string | null;
  notes?: string | null;
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

  await connectDB();
  const body = (await req.json()) as EquipmentPayload;
  const item = await new MongoEquipmentRepository().create({
    name: body.name,
    category: body.category ?? 'other',
    quantity: body.quantity ?? 1,
    status: body.status ?? 'active',
    purchasedAt: body.purchasedAt ? new Date(body.purchasedAt) : null,
    notes: body.notes ?? null,
  });
  return Response.json(item, { status: 201 });
}

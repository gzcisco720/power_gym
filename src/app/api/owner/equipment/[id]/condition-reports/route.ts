import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoEquipmentRepository } from '@/lib/repositories/equipment.repository';
import { MongoConditionReportRepository } from '@/lib/repositories/condition-report.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const equipment = await new MongoEquipmentRepository().findById(id);
  if (!equipment) return Response.json({ error: 'Not found' }, { status: 404 });

  const reports = await new MongoConditionReportRepository().findByEquipmentId(id);
  return Response.json(reports);
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: { note?: string };
  try {
    body = await req.json() as { note?: string };
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const note = body.note?.trim() ?? '';
  if (!note) return Response.json({ error: 'Note is required' }, { status: 400 });

  await connectDB();
  const equipment = await new MongoEquipmentRepository().findById(id);
  if (!equipment) return Response.json({ error: 'Not found' }, { status: 404 });

  const report = await new MongoConditionReportRepository().create({ equipmentId: id, note });
  return Response.json(report, { status: 201 });
}

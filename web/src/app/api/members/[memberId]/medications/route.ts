import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberMedicationRepository } from '@/lib/repositories/member-medication.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';
import type { MedicationDuration } from '@/lib/db/models/member-medication.model';

type RouteContext = { params: Promise<{ memberId: string }> };

async function authorizeAccess(role: UserRole, sessionId: string, memberId: string): Promise<Response | null> {
  if (role === 'member') {
    if (sessionId !== memberId) return Response.json({ error: 'Forbidden' }, { status: 403 });
    return null;
  }
  if (role === 'owner') return null;
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
  if (member.trainerId?.toString() !== sessionId) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId } = await params;
  const role = session.user.role as UserRole;
  await connectDB();
  const denied = await authorizeAccess(role, session.user.id, memberId);
  if (denied) return denied;
  const meds = await new MongoMemberMedicationRepository().findByMember(memberId);
  return Response.json(meds);
}

interface MedPayload {
  name?: string;
  purpose?: string;
  duration?: MedicationDuration;
  startDate?: string;
  endDate?: string | null;
  notes?: string | null;
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (session.user.id !== memberId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: MedPayload;
  try { body = (await req.json()) as MedPayload; } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name?.trim() || !body.purpose?.trim() || !body.duration || !body.startDate) {
    return Response.json({ error: 'name, purpose, duration and startDate are required' }, { status: 400 });
  }

  await connectDB();
  const med = await new MongoMemberMedicationRepository().create({
    memberId,
    name: body.name.trim(),
    purpose: body.purpose.trim(),
    duration: body.duration,
    startDate: new Date(body.startDate),
    endDate: body.endDate ? new Date(body.endDate) : null,
    notes: body.notes ?? null,
  });
  return Response.json(med, { status: 201 });
}

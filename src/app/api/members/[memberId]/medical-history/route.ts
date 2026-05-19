import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberMedicalHistoryRepository } from '@/lib/repositories/member-medical-history.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';
import type { UpsertMedicalHistoryData } from '@/lib/repositories/member-medical-history.repository';

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
  const history = await new MongoMemberMedicalHistoryRepository().findByMember(memberId);
  return Response.json(history);
}

export async function PUT(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (session.user.id !== memberId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: UpsertMedicalHistoryData;
  try {
    body = (await req.json()) as UpsertMedicalHistoryData;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await connectDB();
  const history = await new MongoMemberMedicalHistoryRepository().upsert(memberId, body);
  return Response.json(history);
}

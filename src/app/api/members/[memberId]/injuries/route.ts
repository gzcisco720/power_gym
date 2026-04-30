import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

async function authorizeAccess(
  role: UserRole,
  sessionId: string,
  memberId: string,
): Promise<Response | null> {
  if (role === 'member') {
    if (sessionId !== memberId) return Response.json({ error: 'Forbidden' }, { status: 403 });
    return null;
  }
  if (role === 'owner') return null;

  // trainer
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
  if (member.trainerId?.toString() !== sessionId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
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

  const injuries = await new MongoMemberInjuryRepository().findByMember(memberId);
  return Response.json(injuries);
}

interface InjuryPayload {
  title?: string;
  status?: string;
  trainerNotes?: string | null;
  affectedMovements?: string | null;
  recordedAt?: string;
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: InjuryPayload;
  try {
    body = (await req.json()) as InjuryPayload;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 });

  await connectDB();

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const injury = await new MongoMemberInjuryRepository().create({
    memberId,
    title: body.title.trim(),
    trainerNotes: body.trainerNotes ?? null,
    affectedMovements: body.affectedMovements ?? null,
    recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
  });

  return Response.json(injury, { status: 201 });
}

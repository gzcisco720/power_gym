import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';
import type { CreateInjuryData } from '@/lib/repositories/member-injury.repository';

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
  injuryType?: string | null;
  bodyPart?: string | null;
  bodySide?: string | null;
  painAtRest?: number | null;
  painDuringExercise?: number | null;
  mechanism?: string | null;
  aggravatingFactors?: string | null;
  relievingFactors?: string | null;
  seenDoctor?: boolean;
  affectedMovements?: string | null;
  trainerNotes?: string | null;
  memberNotes?: string | null;
  recordedAt?: string;
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  const data: CreateInjuryData = {
    memberId,
    title: body.title.trim(),
    createdByRole: role === 'member' ? 'member' : 'trainer',
    trainerNotes: role !== 'member' ? (body.trainerNotes ?? null) : null,
    memberNotes: role === 'member' ? (body.memberNotes ?? null) : null,
    affectedMovements: body.affectedMovements ?? null,
    injuryType: (body.injuryType as CreateInjuryData['injuryType']) ?? null,
    bodyPart: (body.bodyPart as CreateInjuryData['bodyPart']) ?? null,
    bodySide: (body.bodySide as CreateInjuryData['bodySide']) ?? null,
    painAtRest: body.painAtRest ?? null,
    painDuringExercise: body.painDuringExercise ?? null,
    mechanism: body.mechanism ?? null,
    aggravatingFactors: body.aggravatingFactors ?? null,
    relievingFactors: body.relievingFactors ?? null,
    seenDoctor: body.seenDoctor ?? false,
    recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
  };

  const injury = await new MongoMemberInjuryRepository().create(data);
  return Response.json(injury, { status: 201 });
}

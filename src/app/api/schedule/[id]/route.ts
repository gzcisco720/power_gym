import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import type { UpdateScheduledSessionData } from '@/lib/repositories/scheduled-session.repository';

type RouteContext = { params: Promise<{ id: string }> };
type Scope = 'one' | 'future' | 'all';

interface PatchBody {
  scope?: string;
  trainerId?: string;
  memberIds?: string[];
  startTime?: string;
  endTime?: string;
}

interface DeleteBody {
  scope?: string;
}

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const scope = body.scope as Scope;
  if (!['one', 'future', 'all'].includes(scope)) {
    return Response.json({ error: 'scope must be one of: one, future, all' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const existing = await repo.findById(id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const update: UpdateScheduledSessionData = {};
  if (typeof body.trainerId === 'string') update.trainerId = body.trainerId;
  if (Array.isArray(body.memberIds)) update.memberIds = body.memberIds;
  if (typeof body.startTime === 'string') update.startTime = body.startTime;
  if (typeof body.endTime === 'string') update.endTime = body.endTime;

  const seriesId = existing.seriesId?.toString();

  if (scope === 'one') {
    await repo.updateOne(id, update);
  } else if (scope === 'future' && seriesId) {
    await repo.updateFuture(seriesId, existing.date, update);
  } else if (scope === 'all' && seriesId) {
    await repo.updateAll(seriesId, update);
  } else {
    await repo.updateOne(id, update);
  }

  return Response.json({ success: true });
}

export async function DELETE(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const scope = body.scope as Scope;
  if (!['one', 'future', 'all'].includes(scope)) {
    return Response.json({ error: 'scope must be one of: one, future, all' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const existing = await repo.findById(id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const seriesId = existing.seriesId?.toString();

  if (scope === 'one') {
    await repo.cancelOne(id);
  } else if (scope === 'future' && seriesId) {
    await repo.cancelFuture(seriesId, existing.date);
  } else if (scope === 'all' && seriesId) {
    await repo.cancelAll(seriesId);
  } else {
    await repo.cancelOne(id);
  }

  return Response.json({ success: true });
}

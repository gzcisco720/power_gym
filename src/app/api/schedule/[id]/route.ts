import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import type { UpdateScheduledSessionData } from '@/lib/repositories/scheduled-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';

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

function isScope(s: string | undefined): s is Scope {
  return s === 'one' || s === 'future' || s === 'all';
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

  if (!isScope(body.scope)) {
    return Response.json({ error: 'scope must be one of: one, future, all' }, { status: 400 });
  }
  const scope = body.scope;

  try {
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
    } else if (seriesId) {
      if (scope === 'future') await repo.updateFuture(seriesId, existing.date, update);
      else await repo.updateAll(seriesId, update);
    } else {
      return Response.json({ error: 'Session is not part of a recurring series' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
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

  if (!isScope(body.scope)) {
    return Response.json({ error: 'scope must be one of: one, future, all' }, { status: 400 });
  }
  const scope = body.scope;

  try {
    await connectDB();
    const repo = new MongoScheduledSessionRepository();
    const existing = await repo.findById(id);
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

    const seriesId = existing.seriesId?.toString();

    if (scope === 'one') {
      await repo.cancelOne(id);
    } else if (seriesId) {
      if (scope === 'future') await repo.cancelFuture(seriesId, existing.date);
      else await repo.cancelAll(seriesId);
    } else {
      return Response.json({ error: 'Session is not part of a recurring series' }, { status: 400 });
    }

    const isSeries = scope !== 'one';
    const memberIds: string[] = Array.isArray(existing.memberIds)
      ? existing.memberIds.map((id) => id.toString())
      : [];
    const userRepo = new MongoUserRepository();
    const [memberDocs, trainer] = await Promise.all([
      Promise.all(memberIds.map((mid: string) => userRepo.findById(mid))),
      userRepo.findById(existing.trainerId?.toString() ?? ''),
    ]);
    const dateLabel = existing.date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const emailService = getEmailService();
    for (const memberDoc of memberDocs) {
      if (!memberDoc) continue;
      try {
        await emailService.sendSessionCancelled({
          to: memberDoc.email,
          trainerName: trainer?.name ?? 'Your trainer',
          date: dateLabel,
          startTime: existing.startTime,
          endTime: existing.endTime,
          isSeries,
        });
      } catch (e) {
        console.error('sendSessionCancelled failed:', e);
      }
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

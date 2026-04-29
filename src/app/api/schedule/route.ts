import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import mongoose from 'mongoose';

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

interface PostBody {
  trainerId?: string;
  memberIds?: string[];
  date?: string;
  startTime?: string;
  endTime?: string;
  isRecurring?: boolean;
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const trainerId =
    session.user.role === 'owner'
      ? typeof body.trainerId === 'string' && body.trainerId
        ? body.trainerId
        : null
      : session.user.id;

  if (!trainerId) return Response.json({ error: 'trainerId is required' }, { status: 400 });
  if (!Array.isArray(body.memberIds) || body.memberIds.length === 0) {
    return Response.json({ error: 'memberIds must be a non-empty array' }, { status: 400 });
  }
  if (typeof body.date !== 'string' || typeof body.startTime !== 'string' || typeof body.endTime !== 'string') {
    return Response.json({ error: 'date, startTime, endTime are required' }, { status: 400 });
  }

  const memberIds = body.memberIds;
  const baseDate = new Date(body.date);
  const isRecurring = body.isRecurring === true;

  await connectDB();
  const repo = new MongoScheduledSessionRepository();

  if (!isRecurring) {
    const doc = await repo.create({
      seriesId: null,
      trainerId,
      memberIds,
      date: baseDate,
      startTime: body.startTime,
      endTime: body.endTime,
    });
    return Response.json({ sessions: [doc] }, { status: 201 });
  }

  const seriesId = new mongoose.Types.ObjectId().toString();
  const sessions = Array.from({ length: 12 }, (_, i) => ({
    seriesId,
    trainerId,
    memberIds,
    date: addWeeks(baseDate, i),
    startTime: body.startTime as string,
    endTime: body.endTime as string,
  }));

  await repo.createMany(sessions);
  return Response.json({ sessions }, { status: 201 });
}

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const startStr = url.searchParams.get('start');
  const endStr = url.searchParams.get('end');
  if (!startStr || !endStr) return Response.json({ error: 'start and end are required' }, { status: 400 });

  const start = new Date(startStr);
  const end = new Date(endStr);

  await connectDB();
  const repo = new MongoScheduledSessionRepository();

  let docs;
  if (session.user.role === 'trainer') {
    docs = await repo.findByDateRange(start, end, { trainerId: session.user.id });
  } else if (session.user.role === 'member') {
    docs = await repo.findByDateRange(start, end, { memberId: session.user.id });
  } else {
    // Owner: optionally filter to a specific trainer's sessions
    const trainerIdParam = url.searchParams.get('trainerId');
    if (trainerIdParam && !/^[a-f0-9]{24}$/.test(trainerIdParam)) {
      return Response.json({ error: 'Invalid trainerId format' }, { status: 400 });
    }
    docs = await repo.findByDateRange(
      start,
      end,
      trainerIdParam ? { trainerId: trainerIdParam } : {},
    );
  }

  return Response.json({ sessions: docs });
}

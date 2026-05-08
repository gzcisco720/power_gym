import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

type RouteContext = { params: Promise<{ id: string }> };

interface CompleteBody {
  rpe?: number | null;
  note?: string | null;
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  let body: CompleteBody = {};
  try {
    body = (await req.json()) as CompleteBody;
  } catch {
    // empty body is fine
  }

  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  // Task 10.2 will branch here on body.saveAsTemplate to also create a PlanTemplate.
  const log = await repo.complete(id, guard.userId, body.rpe ?? null, body.note ?? null);
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(log);
}

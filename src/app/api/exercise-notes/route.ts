import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoExerciseNoteRepository } from '@/lib/repositories/exercise-note.repository';
import type { UserRole } from '@/types/auth';

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const memberId = url.searchParams.get('memberId');
  const exerciseId = url.searchParams.get('exerciseId');
  if (!memberId || !exerciseId) {
    return Response.json({ error: 'memberId and exerciseId required' }, { status: 400 });
  }

  const role = session.user.role as UserRole;
  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const repo = new MongoExerciseNoteRepository();
  const note = await repo.findByMemberAndExercise(memberId, exerciseId);
  return Response.json(note);
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = (await req.json()) as {
    memberId: string;
    exerciseId: string;
    exerciseName: string;
    content: string;
    sessionId: string | null;
  };

  const repo = new MongoExerciseNoteRepository();
  const note = await repo.appendEntry({
    memberId: body.memberId,
    exerciseId: body.exerciseId,
    exerciseName: body.exerciseName,
    trainerId: session.user.id,
    content: body.content,
    sessionId: body.sessionId,
  });
  return Response.json(note, { status: 201 });
}

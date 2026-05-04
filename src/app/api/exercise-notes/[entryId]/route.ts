import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoExerciseNoteRepository } from '@/lib/repositories/exercise-note.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ entryId: string }> };

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { entryId } = await params;
  const body = (await req.json()) as { noteId: string; content: string };

  await connectDB();
  const repo = new MongoExerciseNoteRepository();
  const updated = await repo.updateEntry(body.noteId, entryId, body.content);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}

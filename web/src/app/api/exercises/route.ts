import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import type { UserRole } from '@/types/auth';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const exerciseRepo = new MongoExerciseRepository();
  const role = session.user.role as UserRole;

  let creatorId: string | null = null;
  if (role === 'member') {
    creatorId = session.user.trainerId ?? null;
  } else {
    creatorId = session.user.id;
  }

  const exercises = await exerciseRepo.findAll({ creatorId });
  return Response.json(exercises);
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = (await req.json()) as {
    name: string;
    muscleGroup?: string | null;
    imageUrl?: string | null;
    isBodyweight?: boolean;
    equipmentIds?: string[];
  };

  const exerciseRepo = new MongoExerciseRepository();
  const exercise = await exerciseRepo.create({
    name: body.name,
    muscleGroup: body.muscleGroup ?? null,
    imageUrl: body.imageUrl ?? null,
    isBodyweight: body.isBodyweight ?? false,
    isGlobal: false,
    createdBy: session.user.id,
    equipmentIds: body.equipmentIds ?? [],
  });

  return Response.json(exercise, { status: 201 });
}

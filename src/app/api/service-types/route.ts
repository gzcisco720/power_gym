import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoServiceTypeRepository } from '@/lib/repositories/service-type.repository';

interface PostBody {
  name?: string;
  durationMin?: number;
  pricePerSession?: number;
  note?: string;
}

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const repo = new MongoServiceTypeRepository();
  const types = await repo.findAll();
  return Response.json({ serviceTypes: types });
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }
  if (typeof body.durationMin !== 'number' || body.durationMin < 1) {
    return Response.json({ error: 'durationMin must be a positive number' }, { status: 400 });
  }
  if (typeof body.pricePerSession !== 'number' || body.pricePerSession < 0) {
    return Response.json({ error: 'pricePerSession must be a non-negative number' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoServiceTypeRepository();
  const serviceType = await repo.create({
    name: body.name.trim(),
    durationMin: body.durationMin,
    pricePerSession: body.pricePerSession,
    note: typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null,
    createdBy: session.user.id,
  });

  return Response.json({ serviceType }, { status: 201 });
}

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoServiceTypeRepository } from '@/lib/repositories/service-type.repository';

type RouteContext = { params: Promise<{ id: string }> };

interface PatchBody {
  name?: string;
  durationMin?: number;
  pricePerSession?: number;
  note?: string | null;
  isActive?: boolean;
}

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (typeof body.durationMin === 'number' && body.durationMin < 1) {
    return Response.json({ error: 'durationMin must be at least 1' }, { status: 400 });
  }
  if (typeof body.pricePerSession === 'number' && body.pricePerSession < 0) {
    return Response.json({ error: 'pricePerSession must be non-negative' }, { status: 400 });
  }

  const hasUpdate = typeof body.name === 'string' || typeof body.durationMin === 'number' ||
    typeof body.pricePerSession === 'number' || 'note' in body || typeof body.isActive === 'boolean';
  if (!hasUpdate) {
    return Response.json({ error: 'At least one field required' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoServiceTypeRepository();
  const updated = await repo.update(id, {
    ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
    ...(typeof body.durationMin === 'number' ? { durationMin: body.durationMin } : {}),
    ...(typeof body.pricePerSession === 'number' ? { pricePerSession: body.pricePerSession } : {}),
    ...('note' in body ? { note: body.note ?? null } : {}),
    ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
  });

  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ serviceType: updated });
}

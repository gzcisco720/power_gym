import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import type { UpdateProfileData } from '@/lib/repositories/user-profile.repository';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const profile = await new MongoUserProfileRepository().findByUserId(session.user.id);
  return Response.json(profile);
}

export async function PATCH(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = (await req.json()) as UpdateProfileData;
  const updated = await new MongoUserProfileRepository().upsert(session.user.id, body);
  return Response.json(updated);
}

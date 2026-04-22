import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import type { UserRole } from '@/types/auth';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

function requireTrainerOrOwner(role: UserRole): Response | null {
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = requireTrainerOrOwner(session.user.role as UserRole);
  if (denied) return denied;

  await connectDB();
  const repo = new MongoPlanTemplateRepository();
  const templates = await repo.findByCreator(session.user.id);
  return Response.json(templates);
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = requireTrainerOrOwner(session.user.role as UserRole);
  if (denied) return denied;

  await connectDB();
  const body = (await req.json()) as {
    name: string;
    description?: string | null;
    days?: IPlanDay[];
  };

  const repo = new MongoPlanTemplateRepository();
  const template = await repo.create({
    name: body.name,
    description: body.description ?? null,
    createdBy: session.user.id,
    days: body.days ?? [],
  });

  return Response.json(template, { status: 201 });
}

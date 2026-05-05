import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { requireTrainerOrOwner, checkTemplateOwnership } from '@/lib/api/route-guards';
import type { UserRole } from '@/types/auth';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = requireTrainerOrOwner(session.user.role as UserRole);
  if (denied) return denied;

  await connectDB();
  const { id } = await params;
  const repo = new MongoNutritionTemplateRepository();
  const template = await repo.findById(id);
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 });
  const ownershipDenied = checkTemplateOwnership(template, session.user.id, session.user.role as UserRole);
  if (ownershipDenied) return ownershipDenied;

  return Response.json(template);
}

export async function PUT(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = requireTrainerOrOwner(session.user.role as UserRole);
  if (denied) return denied;

  await connectDB();
  const { id } = await params;
  const repo = new MongoNutritionTemplateRepository();
  const template = await repo.findById(id);
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 });
  const ownershipDenied = checkTemplateOwnership(template, session.user.id, session.user.role as UserRole);
  if (ownershipDenied) return ownershipDenied;

  const body = (await req.json()) as { name?: string; description?: string | null; dayTypes?: IDayType[] };
  const updated = await repo.update(id, body);
  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = requireTrainerOrOwner(session.user.role as UserRole);
  if (denied) return denied;

  await connectDB();
  const { id } = await params;
  const repo = new MongoNutritionTemplateRepository();
  const template = await repo.findById(id);
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 });
  const ownershipDenied = checkTemplateOwnership(template, session.user.id, session.user.role as UserRole);
  if (ownershipDenied) return ownershipDenied;

  await repo.deleteById(id, session.user.id);
  return new Response(null, { status: 204 });
}

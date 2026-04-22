import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import type { UserRole } from '@/types/auth';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

type RouteContext = { params: Promise<{ id: string }> };

async function getAuthorizedTemplate(id: string, userId: string, role: UserRole) {
  const repo = new MongoPlanTemplateRepository();
  const template = await repo.findById(id);
  if (!template) return { template: null, repo, error: Response.json({ error: 'Not found' }, { status: 404 }) };

  if (role !== 'owner' && template.createdBy.toString() !== userId) {
    return { template: null, repo, error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { template, repo, error: null };
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user.role as UserRole) === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const { template, error } = await getAuthorizedTemplate(id, session.user.id, session.user.role as UserRole);
  if (error) return error;

  return Response.json(template);
}

export async function PUT(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user.role as UserRole) === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const { repo, error } = await getAuthorizedTemplate(id, session.user.id, session.user.role as UserRole);
  if (error) return error;

  const body = (await req.json()) as { name?: string; description?: string | null; days?: IPlanDay[] };
  const updated = await repo.update(id, body);
  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user.role as UserRole) === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const { repo, error } = await getAuthorizedTemplate(id, session.user.id, session.user.role as UserRole);
  if (error) return error;

  await repo.deleteById(id, session.user.id);
  return new Response(null, { status: 204 });
}

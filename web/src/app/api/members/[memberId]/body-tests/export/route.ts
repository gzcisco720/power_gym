import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;

  await connectDB();

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member || member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const tests = await new MongoBodyTestRepository().findByMember(memberId);

  const rows = [
    'Date,Weight (kg),Body Fat (%),Fat Mass (kg),Lean Mass (kg),Protocol',
    ...tests.map((t) =>
      [
        new Date(t.date).toISOString().split('T')[0],
        t.weight.toFixed(1),
        t.bodyFatPct.toFixed(1),
        t.fatMassKg.toFixed(1),
        t.leanMassKg.toFixed(1),
        t.protocol,
      ].join(','),
    ),
  ];

  return new Response(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="body-tests-${memberId}.csv"`,
    },
  });
}

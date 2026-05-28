import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const tests = await new MongoBodyTestRepository().findByMember(session.user.id);

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
      'Content-Disposition': 'attachment; filename="my-body-tests.csv"',
    },
  });
}

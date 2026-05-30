import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
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

  const allSessions = await new MongoWorkoutSessionRepository().findByMember(memberId);
  const sessions = allSessions.filter((s) => s.completedAt !== null);

  const rows = [
    'Date,Day Name,Exercise,Set,Weight (kg),Reps',
    ...sessions.flatMap((s) =>
      s.sets
        .filter((set) => set.actualWeight !== null || set.actualReps !== null)
        .map((set) =>
          [
            new Date(s.completedAt!).toISOString().split('T')[0],
            `"${s.dayName}"`,
            `"${set.exerciseName}"`,
            set.setNumber,
            set.actualWeight !== null ? set.actualWeight.toFixed(1) : '',
            set.actualReps !== null ? set.actualReps : '',
          ].join(','),
        ),
    ),
  ];

  return new Response(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sessions-${memberId}.csv"`,
    },
  });
}

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const allSessions = await new MongoWorkoutSessionRepository().findByMember(session.user.id);
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
      'Content-Disposition': 'attachment; filename="my-sessions.csv"',
    },
  });
}

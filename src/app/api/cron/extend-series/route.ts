import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const seriesIds = await repo.findActiveSeriesIds();
  let extended = 0;

  for (const seriesId of seriesIds) {
    const latest = await repo.findLatestInSeries(seriesId);
    if (!latest) continue;

    const nextDate = new Date(latest.date);
    nextDate.setDate(nextDate.getDate() + 7);

    await repo.createMany([{
      seriesId,
      trainerId: latest.trainerId.toString(),
      memberIds: latest.memberIds.map((id) => id.toString()),
      date: nextDate,
      startTime: latest.startTime,
      endTime: latest.endTime,
    }]);
    extended++;
  }

  return Response.json({ extended });
}

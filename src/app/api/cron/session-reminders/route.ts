import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';

interface ResolvedMember {
  index: number;
  name: string;
  email: string;
}

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const userRepo = new MongoUserRepository();
  const emailService = getEmailService();

  const now = new Date();
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const sessions = await repo.findUnreminded(windowStart, windowEnd);
  let sent = 0;

  for (const s of sessions) {
    const trainer = await userRepo.findById(s.trainerId.toString());
    if (!trainer) continue;

    const memberDocs = await Promise.all(
      s.memberIds.map((id) => userRepo.findById(id.toString())),
    );

    const members: ResolvedMember[] = memberDocs
      .map((m, i) => (m !== null ? { index: i, name: m.name, email: m.email } : null))
      .filter((m): m is ResolvedMember => m !== null);

    const dateLabel = s.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    for (const member of members) {
      const otherNames = members
        .filter((m) => m.index !== member.index)
        .map((m) => m.name);
      try {
        await emailService.sendSessionReminder({
          to: member.email,
          memberName: member.name,
          trainerName: trainer.name,
          date: dateLabel,
          startTime: s.startTime,
          endTime: s.endTime,
          groupMembers: otherNames,
        });
      } catch {
        // log and continue — marking reminder sent below to avoid re-sending to other members
      }
    }

    await repo.markReminderSent(s._id.toString());
    sent++;
  }

  return Response.json({ sent });
}

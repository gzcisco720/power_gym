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

  const results = await Promise.all(
    sessions.map(async (s) => {
      const [trainer, memberDocs] = await Promise.all([
        userRepo.findById(s.trainerId.toString()),
        Promise.all(s.memberIds.map((id) => userRepo.findById(id.toString()))),
      ]);
      if (!trainer) return false;

      const members: ResolvedMember[] = memberDocs.flatMap((m, i) =>
        m !== null ? [{ index: i, name: m.name, email: m.email }] : [],
      );

      const dateLabel = s.date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await Promise.all(
        members.map(async (member) => {
          const otherNames = members.flatMap((m) =>
            m.index !== member.index ? [m.name] : [],
          );
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
            // log and continue
          }
        }),
      );

      await repo.markReminderSent(s._id.toString());
      return true;
    }),
  );
  const sent = results.filter(Boolean).length;

  return Response.json({ sent });
}

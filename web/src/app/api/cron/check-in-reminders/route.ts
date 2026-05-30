import { connectDB } from '@/lib/db/connect';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const configRepo = new MongoCheckInConfigRepository();
  const userRepo = new MongoUserRepository();
  const emailService = getEmailService();

  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const configs = await configRepo.findDueForReminder(dayOfWeek, hour, weekStart);

  const results = await Promise.all(
    configs.map(async (config) => {
      const memberId = config.memberId.toString();
      const trainerId = config.trainerId.toString();

      const [member, trainer] = await Promise.all([
        userRepo.findById(memberId),
        userRepo.findById(trainerId),
      ]);
      if (!member || !trainer) return false;

      const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
      const checkInUrl = `${appUrl}/member/check-in`;

      try {
        await emailService.sendCheckInReminder({
          to: member.email,
          memberName: member.name,
          trainerName: trainer.name,
          checkInUrl,
        });
      } catch {
        // log and continue
      }

      await configRepo.markReminderSent(memberId, now);
      return true;
    }),
  );
  const sent = results.filter(Boolean).length;

  return Response.json({ sent });
}

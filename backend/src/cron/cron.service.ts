import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { SelfWorkoutLogRepository } from '../repositories/self-workout-log.repository';
import { CheckInConfigRepository } from '../repositories/check-in-config.repository';
import { UserRepository } from '../repositories/user.repository';

const STALE_AFTER_HOURS = 24;

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly scheduledSessionRepo: ScheduledSessionRepository,
    private readonly workoutSessionRepo: WorkoutSessionRepository,
    private readonly selfWorkoutLogRepo: SelfWorkoutLogRepository,
    private readonly checkInConfigRepo: CheckInConfigRepository,
    private readonly userRepo: UserRepository,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 * * * *')
  async sessionReminders(): Promise<{ sent: number }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const sessions = await this.scheduledSessionRepo.findUnreminded(
      windowStart,
      windowEnd,
    );

    const results = await Promise.all(
      sessions.map(async (s) => {
        const [trainer, memberDocs] = await Promise.all([
          this.userRepo.findById(s.trainerId.toString()),
          Promise.all(
            s.memberIds.map((id) => this.userRepo.findById(id.toString())),
          ),
        ]);
        if (!trainer) return false;

        const members = memberDocs.flatMap((m, i) =>
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
              await this.emailService.sendSessionReminder({
                to: member.email,
                memberName: member.name,
                trainerName: trainer.name,
                date: dateLabel,
                startTime: s.startTime,
                endTime: s.endTime,
                groupMembers: otherNames,
              });
            } catch (err) {
              this.logger.warn(
                `Session reminder failed for ${member.email}: ${String(err)}`,
              );
            }
          }),
        );

        await this.scheduledSessionRepo.markReminderSent(s._id.toString());
        return true;
      }),
    );

    const sent = results.filter(Boolean).length;
    this.logger.log(`sessionReminders: sent=${sent}`);
    return { sent };
  }

  @Cron('0 * * * *')
  async checkInReminders(): Promise<{ sent: number }> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const configs = await this.checkInConfigRepo.findDueForReminder(
      dayOfWeek,
      hour,
      weekStart,
    );

    const appUrl =
      this.config.get<string>('APP_URL') ?? 'http://localhost:3000';

    const results = await Promise.all(
      configs.map(async (cfg) => {
        const [member, trainer] = await Promise.all([
          this.userRepo.findById(cfg.memberId.toString()),
          this.userRepo.findById(cfg.trainerId.toString()),
        ]);
        if (!member || !trainer) return false;

        try {
          await this.emailService.sendCheckInReminder({
            to: member.email,
            memberName: member.name,
            trainerName: trainer.name,
            checkInUrl: `${appUrl}/member/check-in`,
          });
        } catch (err) {
          this.logger.warn(
            `Check-in reminder failed for ${member.email}: ${String(err)}`,
          );
        }

        await this.checkInConfigRepo.markReminderSent(
          cfg.memberId.toString(),
          now,
        );
        return true;
      }),
    );

    const sent = results.filter(Boolean).length;
    this.logger.log(`checkInReminders: sent=${sent}`);
    return { sent };
  }

  @Cron('0 2 * * 1')
  async extendSeries(): Promise<{ extended: number }> {
    const seriesIds = await this.scheduledSessionRepo.findActiveSeriesIds();

    const results = await Promise.all(
      seriesIds.map(async (seriesId) => {
        try {
          const latest =
            await this.scheduledSessionRepo.findLatestInSeries(seriesId);
          if (!latest) return false;

          const nextDate = new Date(latest.date);
          nextDate.setDate(nextDate.getDate() + 7);

          await this.scheduledSessionRepo.createMany([
            {
              seriesId,
              trainerId: latest.trainerId.toString(),
              memberIds: latest.memberIds.map((id) => id.toString()),
              date: nextDate,
              startTime: latest.startTime,
              endTime: latest.endTime,
            },
          ]);
          return true;
        } catch (err) {
          this.logger.warn(
            `extendSeries failed for ${seriesId}: ${String(err)}`,
          );
          return false;
        }
      }),
    );

    const extended = results.filter(Boolean).length;
    this.logger.log(`extendSeries: extended=${extended}`);
    return { extended };
  }

  @Cron('0 3 * * *')
  async sealStaleWorkouts(): Promise<{
    sealed: { selfWorkoutLogs: number; workoutSessions: number };
  }> {
    const [staleSelf, staleSessions] = await Promise.all([
      this.selfWorkoutLogRepo.findStaleActive(STALE_AFTER_HOURS),
      this.workoutSessionRepo.findStaleActive(STALE_AFTER_HOURS),
    ]);

    const [selfResults, sessionResults] = await Promise.all([
      Promise.all(
        staleSelf.map((log) =>
          this.selfWorkoutLogRepo.autoSeal(log._id.toString()),
        ),
      ),
      Promise.all(
        staleSessions.map((sess) =>
          this.workoutSessionRepo.autoSeal(sess._id.toString()),
        ),
      ),
    ]);

    const selfWorkoutLogs = selfResults.filter((r) => r?.autoSealed).length;
    const workoutSessions = sessionResults.filter((r) => r?.autoSealed).length;

    this.logger.log(
      `sealStaleWorkouts: selfWorkoutLogs=${selfWorkoutLogs} workoutSessions=${workoutSessions}`,
    );
    return { sealed: { selfWorkoutLogs, workoutSessions } };
  }
}

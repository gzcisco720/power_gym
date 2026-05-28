import 'reflect-metadata';
import { Cron } from '@nestjs/schedule';
import { CronService } from './cron.service';

// ── Cron decorator metadata ────────────────────────────────────────────────

describe('CronService @Cron decorators', () => {
  const SCHEDULE_KEY = 'SCHEDULE_CRON_OPTIONS';

  // NestJS SetMetadata stores metadata on the function itself (not prototype+key pair)
  function getCronExpression(
    method: keyof typeof CronService.prototype,
  ): string | undefined {
    const fn = CronService.prototype[method] as object;
    const meta = Reflect.getMetadata(SCHEDULE_KEY, fn) as
      | { cronTime?: string }
      | undefined;
    return meta?.cronTime;
  }

  it('sessionReminders has cron schedule 0 * * * *', () => {
    expect(getCronExpression('sessionReminders')).toBe('0 * * * *');
  });

  it('checkInReminders has cron schedule 0 * * * *', () => {
    expect(getCronExpression('checkInReminders')).toBe('0 * * * *');
  });

  it('extendSeries has cron schedule 0 2 * * 1', () => {
    expect(getCronExpression('extendSeries')).toBe('0 2 * * 1');
  });

  it('sealStaleWorkouts has cron schedule 0 3 * * *', () => {
    expect(getCronExpression('sealStaleWorkouts')).toBe('0 3 * * *');
  });
});

// Ensure Cron import is used so TS doesn't complain
void Cron;

// ── sessionReminders unit test ─────────────────────────────────────────────

describe('CronService.sessionReminders', () => {
  it('calls EmailService.sendSessionReminder once per session member', async () => {
    const mockSession = {
      _id: { toString: () => 'sess1' },
      trainerId: { toString: () => 'trainer1' },
      memberIds: [{ toString: () => 'member1' }],
      date: new Date('2026-06-01'),
      startTime: '09:00',
      endTime: '10:00',
    };

    const mockTrainer = { name: 'Bob', email: 'bob@example.com' };
    const mockMember = { name: 'Alice', email: 'alice@example.com' };

    const emailService = {
      sendSessionReminder: jest.fn().mockResolvedValue(undefined),
    };
    const scheduledSessionRepo = {
      findUnreminded: jest.fn().mockResolvedValue([mockSession]),
      markReminderSent: jest.fn().mockResolvedValue(undefined),
    };
    const workoutSessionRepo = {
      findStaleActive: jest.fn(),
      autoSeal: jest.fn(),
    };
    const selfWorkoutLogRepo = {
      findStaleActive: jest.fn(),
      autoSeal: jest.fn(),
    };
    const checkInConfigRepo = {
      findDueForReminder: jest.fn(),
      markReminderSent: jest.fn(),
    };
    const userRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === 'trainer1') return Promise.resolve(mockTrainer);
        if (id === 'member1') return Promise.resolve(mockMember);
        return Promise.resolve(null);
      }),
    };
    const config = { get: jest.fn().mockReturnValue('http://localhost:3000') };

    const service = new CronService(
      emailService as never,
      scheduledSessionRepo as never,
      workoutSessionRepo as never,
      selfWorkoutLogRepo as never,
      checkInConfigRepo as never,
      userRepo as never,
      config as never,
    );

    const result = await service.sessionReminders();

    expect(emailService.sendSessionReminder).toHaveBeenCalledTimes(1);
    expect(emailService.sendSessionReminder).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@example.com', memberName: 'Alice' }),
    );
    expect(scheduledSessionRepo.markReminderSent).toHaveBeenCalledWith('sess1');
    expect(result.sent).toBe(1);
  });
});

// ── sealStaleWorkouts unit test ────────────────────────────────────────────

describe('CronService.sealStaleWorkouts', () => {
  it('seals stale workout sessions and self workout logs', async () => {
    const mockSession = { _id: { toString: () => 'ws1' } };
    const mockLog = { _id: { toString: () => 'swl1' } };

    const emailService = { sendSessionReminder: jest.fn() };
    const scheduledSessionRepo = {};
    const workoutSessionRepo = {
      findStaleActive: jest.fn().mockResolvedValue([mockSession]),
      autoSeal: jest.fn().mockResolvedValue({ autoSealed: true }),
    };
    const selfWorkoutLogRepo = {
      findStaleActive: jest.fn().mockResolvedValue([mockLog]),
      autoSeal: jest.fn().mockResolvedValue({ autoSealed: true }),
    };
    const checkInConfigRepo = {};
    const userRepo = {};
    const config = { get: jest.fn() };

    const service = new CronService(
      emailService as never,
      scheduledSessionRepo as never,
      workoutSessionRepo as never,
      selfWorkoutLogRepo as never,
      checkInConfigRepo as never,
      userRepo as never,
      config as never,
    );

    const result = await service.sealStaleWorkouts();

    expect(workoutSessionRepo.autoSeal).toHaveBeenCalledWith('ws1');
    expect(selfWorkoutLogRepo.autoSeal).toHaveBeenCalledWith('swl1');
    expect(result.sealed.workoutSessions).toBe(1);
    expect(result.sealed.selfWorkoutLogs).toBe(1);
  });
});

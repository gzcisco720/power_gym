import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { SelfWorkoutLogModel } from '@/lib/db/models/self-workout-log.model';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await SelfWorkoutLogModel.deleteMany({});
});

const userId = new mongoose.Types.ObjectId().toString();
const tplA = new mongoose.Types.ObjectId().toString();

async function seedLog(opts: {
  daysAgo: number;
  templateId?: string | null;
  dayName?: string;
  completed?: boolean;
}) {
  const startedAt = new Date(Date.now() - opts.daysAgo * 86400000 - 3600000);
  const completedAt = opts.completed === false ? null : new Date(Date.now() - opts.daysAgo * 86400000);
  return SelfWorkoutLogModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    startedAt,
    completedAt,
    lastActivityAt: completedAt ?? startedAt,
    autoSealed: false,
    sourceTemplateId: opts.templateId ? new mongoose.Types.ObjectId(opts.templateId) : null,
    sourceTemplateDayNumber: opts.templateId ? 2 : null,
    dayName: opts.dayName ?? 'Push',
    sets: [],
    rpe: null,
    note: null,
  });
}

describe('SelfWorkoutLogRepository — findRecent', () => {
  it('returns most-recently-completed logs first, capped at limit', async () => {
    await seedLog({ daysAgo: 5, dayName: 'A' });
    await seedLog({ daysAgo: 1, dayName: 'B' });
    await seedLog({ daysAgo: 3, dayName: 'C' });
    await seedLog({ daysAgo: 10, dayName: 'D' });

    const repo = new MongoSelfWorkoutLogRepository();
    const recent = await repo.findRecent(userId, 3);

    expect(recent.map((l) => l.dayName)).toEqual(['B', 'C', 'A']);
  });

  it('excludes logs that are not completed', async () => {
    await seedLog({ daysAgo: 1, dayName: 'Active', completed: false });
    await seedLog({ daysAgo: 2, dayName: 'Done' });

    const repo = new MongoSelfWorkoutLogRepository();
    const recent = await repo.findRecent(userId, 5);

    expect(recent.map((l) => l.dayName)).toEqual(['Done']);
  });
});

describe('SelfWorkoutLogRepository — findLastByTemplate', () => {
  it('returns null when no log has a sourceTemplateId', async () => {
    await seedLog({ daysAgo: 1 });
    await seedLog({ daysAgo: 2 });

    const repo = new MongoSelfWorkoutLogRepository();
    expect(await repo.findLastByTemplate(userId)).toBeNull();
  });

  it('returns the most recent log that has a sourceTemplateId', async () => {
    await seedLog({ daysAgo: 1, dayName: 'Freestyle' });
    await seedLog({ daysAgo: 3, templateId: tplA, dayName: 'Push' });
    await seedLog({ daysAgo: 5, templateId: tplA, dayName: 'Pull' });

    const repo = new MongoSelfWorkoutLogRepository();
    const last = await repo.findLastByTemplate(userId);

    expect(last?.dayName).toBe('Push');
    expect(last?.sourceTemplateId?.toString()).toBe(tplA);
  });
});

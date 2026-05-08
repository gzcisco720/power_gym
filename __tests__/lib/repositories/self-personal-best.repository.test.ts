import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
import { SelfPersonalBestModel } from '@/lib/db/models/self-personal-best.model';

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
  await SelfPersonalBestModel.deleteMany({});
});

const userId = new mongoose.Types.ObjectId().toString();
const exA = new mongoose.Types.ObjectId().toString();
const logId = new mongoose.Types.ObjectId().toString();

describe('SelfPersonalBestRepository', () => {
  it('upserts when no PB exists yet', async () => {
    const repo = new MongoSelfPersonalBestRepository();
    const wasUpdated = await repo.upsertIfBetter({
      userId, exerciseId: exA, exerciseName: 'Bench', weight: 100, reps: 5, logId,
    });

    expect(wasUpdated).toBe(true);
    const all = await repo.findByUser(userId);
    expect(all).toHaveLength(1);
    expect(all[0].bestWeight).toBe(100);
    expect(all[0].estimatedOneRM).toBeCloseTo(116.67, 1);
  });

  it('does not update when new estimated 1RM is lower', async () => {
    const repo = new MongoSelfPersonalBestRepository();
    await repo.upsertIfBetter({ userId, exerciseId: exA, exerciseName: 'Bench', weight: 100, reps: 5, logId });
    const wasUpdated = await repo.upsertIfBetter({
      userId, exerciseId: exA, exerciseName: 'Bench', weight: 90, reps: 5, logId,
    });

    expect(wasUpdated).toBe(false);
    const all = await repo.findByUser(userId);
    expect(all[0].bestWeight).toBe(100);
  });

  it('updates when new estimated 1RM is higher', async () => {
    const repo = new MongoSelfPersonalBestRepository();
    await repo.upsertIfBetter({ userId, exerciseId: exA, exerciseName: 'Bench', weight: 100, reps: 5, logId });
    const wasUpdated = await repo.upsertIfBetter({
      userId, exerciseId: exA, exerciseName: 'Bench', weight: 105, reps: 5, logId,
    });

    expect(wasUpdated).toBe(true);
    const all = await repo.findByUser(userId);
    expect(all[0].bestWeight).toBe(105);
  });
});

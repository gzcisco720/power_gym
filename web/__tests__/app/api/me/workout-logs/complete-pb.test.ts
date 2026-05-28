import { POST } from '@/app/api/me/workout-logs/[id]/complete/route';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
import { connectDB } from '@/lib/db/connect';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('@/lib/auth/self-tracking-access');
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';

let mongo: MongoMemoryServer;
const userId = new mongoose.Types.ObjectId().toString();
const exA = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  (connectDB as jest.Mock).mockResolvedValue(undefined);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  jest.clearAllMocks();
  (requireSelfTrackingRole as jest.Mock).mockResolvedValue({ ok: true, userId, role: 'trainer' });
  await mongoose.connection.dropDatabase();
});

describe('POST /api/me/workout-logs/[id]/complete — PB hook', () => {
  it('records a PB for the heaviest set per exercise on complete', async () => {
    const logRepo = new MongoSelfWorkoutLogRepository();
    const log = await logRepo.create({
      userId,
      startedAt: new Date(),
      sourceTemplateId: null,
      sourceTemplateDayNumber: null,
      dayName: 'Freestyle',
      sets: [
        {
          exerciseId: new mongoose.Types.ObjectId(exA),
          exerciseName: 'Bench',
          groupId: 'g1',
          isSuperset: false,
          isBodyweight: false,
          setNumber: 1,
          prescribedRepsMin: null,
          prescribedRepsMax: null,
          actualWeight: 90,
          actualReps: 5,
          completedAt: new Date(),
        },
        {
          exerciseId: new mongoose.Types.ObjectId(exA),
          exerciseName: 'Bench',
          groupId: 'g1',
          isSuperset: false,
          isBodyweight: false,
          setNumber: 2,
          prescribedRepsMin: null,
          prescribedRepsMax: null,
          actualWeight: 100,
          actualReps: 5,
          completedAt: new Date(),
        },
      ],
    });

    const req = new Request(`http://localhost/api/me/workout-logs/${log._id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ rpe: 8, note: null }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: log._id.toString() }) });
    expect(res.status).toBe(200);

    const pbs = await new MongoSelfPersonalBestRepository().findByUser(userId);
    expect(pbs).toHaveLength(1);
    expect(pbs[0].bestWeight).toBe(100);
    expect(pbs[0].bestReps).toBe(5);
  });

  it('skips sets with null weight or reps', async () => {
    const logRepo = new MongoSelfWorkoutLogRepository();
    const log = await logRepo.create({
      userId,
      startedAt: new Date(),
      sourceTemplateId: null,
      sourceTemplateDayNumber: null,
      dayName: 'Freestyle',
      sets: [
        {
          exerciseId: new mongoose.Types.ObjectId(exA),
          exerciseName: 'Bench',
          groupId: 'g1',
          isSuperset: false,
          isBodyweight: false,
          setNumber: 1,
          prescribedRepsMin: null,
          prescribedRepsMax: null,
          actualWeight: null,
          actualReps: null,
          completedAt: null,
        },
      ],
    });

    const req = new Request(`http://localhost/api/me/workout-logs/${log._id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ rpe: null, note: null }),
    });
    await POST(req, { params: Promise.resolve({ id: log._id.toString() }) });

    const pbs = await new MongoSelfPersonalBestRepository().findByUser(userId);
    expect(pbs).toHaveLength(0);
  });
});

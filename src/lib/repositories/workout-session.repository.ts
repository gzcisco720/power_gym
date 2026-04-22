import mongoose from 'mongoose';
import type { IWorkoutSession, ISessionSet } from '@/lib/db/models/workout-session.model';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

export interface CreateSessionData {
  memberId: string;
  memberPlanId: string;
  dayNumber: number;
  dayName: string;
  startedAt: Date;
  sets: Omit<ISessionSet, 'completedAt'>[];
}

export interface UpdateSetData {
  actualWeight: number | null;
  actualReps: number | null;
}

export interface IWorkoutSessionRepository {
  create(data: CreateSessionData): Promise<IWorkoutSession>;
  findById(id: string): Promise<IWorkoutSession | null>;
  findByMember(memberId: string): Promise<IWorkoutSession[]>;
  updateSet(id: string, setIndex: number, data: UpdateSetData): Promise<IWorkoutSession | null>;
  addExtraSet(id: string, extraSet: ISessionSet): Promise<IWorkoutSession | null>;
  complete(id: string): Promise<IWorkoutSession | null>;
}

export class MongoWorkoutSessionRepository implements IWorkoutSessionRepository {
  async create(data: CreateSessionData): Promise<IWorkoutSession> {
    const session = new WorkoutSessionModel({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      memberPlanId: new mongoose.Types.ObjectId(data.memberPlanId),
      dayNumber: data.dayNumber,
      dayName: data.dayName,
      startedAt: data.startedAt,
      completedAt: null,
      sets: data.sets,
    });
    return session.save();
  }

  async findById(id: string): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findById(id);
  }

  async findByMember(memberId: string): Promise<IWorkoutSession[]> {
    return WorkoutSessionModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
    }).sort({ startedAt: -1 });
  }

  async updateSet(id: string, setIndex: number, data: UpdateSetData): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findByIdAndUpdate(
      id,
      {
        $set: {
          [`sets.${setIndex}.actualWeight`]: data.actualWeight,
          [`sets.${setIndex}.actualReps`]: data.actualReps,
          [`sets.${setIndex}.completedAt`]: new Date(),
        },
      },
      { new: true },
    );
  }

  async addExtraSet(id: string, extraSet: ISessionSet): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findByIdAndUpdate(
      id,
      { $push: { sets: extraSet } },
      { new: true },
    );
  }

  async complete(id: string): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findByIdAndUpdate(
      id,
      { $set: { completedAt: new Date() } },
      { new: true },
    );
  }
}

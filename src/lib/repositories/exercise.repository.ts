import mongoose from 'mongoose';
import type { IExercise } from '@/lib/db/models/exercise.model';
import { ExerciseModel } from '@/lib/db/models/exercise.model';

export interface CreateExerciseData {
  name: string;
  muscleGroup: string | null;
  isGlobal: boolean;
  createdBy: string | null;
  imageUrl: string | null;
  isBodyweight: boolean;
  equipmentIds?: string[];
}

export interface FindExercisesOptions {
  creatorId?: string | null;
}

export interface IExerciseRepository {
  findAll(options: FindExercisesOptions): Promise<IExercise[]>;
  create(data: CreateExerciseData): Promise<IExercise>;
}

export class MongoExerciseRepository implements IExerciseRepository {
  async findAll({ creatorId }: FindExercisesOptions = {}): Promise<IExercise[]> {
    const query = creatorId
      ? { $or: [{ isGlobal: true }, { createdBy: new mongoose.Types.ObjectId(creatorId) }] }
      : { isGlobal: true };
    return ExerciseModel.find(query);
  }

  async create(data: CreateExerciseData): Promise<IExercise> {
    const exercise = new ExerciseModel({
      ...data,
      createdBy: data.createdBy ? new mongoose.Types.ObjectId(data.createdBy) : null,
      equipmentIds: (data.equipmentIds ?? []).map((id) => new mongoose.Types.ObjectId(id)),
    });
    return exercise.save();
  }
}

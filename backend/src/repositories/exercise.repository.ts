import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IExercise, EXERCISE_MODEL } from '../database/models/exercise.model';

export interface CreateExerciseData {
  name: string;
  muscleGroup: string | null;
  isGlobal: boolean;
  createdBy: string | null;
  imageUrl: string | null;
  isBodyweight: boolean;
  equipmentIds?: string[];
  bodyParts?: string[];
}

@Injectable()
export class ExerciseRepository {
  constructor(
    @InjectModel(EXERCISE_MODEL)
    private readonly model: Model<IExercise>,
  ) {}

  async findAll(creatorId?: string | null): Promise<IExercise[]> {
    const query = creatorId
      ? {
          $or: [
            { isGlobal: true },
            { createdBy: new Types.ObjectId(creatorId) },
          ],
        }
      : { isGlobal: true };
    return this.model.find(query);
  }

  async create(data: CreateExerciseData): Promise<IExercise> {
    const doc = new this.model({
      ...data,
      createdBy: data.createdBy ? new Types.ObjectId(data.createdBy) : null,
      equipmentIds: (data.equipmentIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      bodyParts: data.bodyParts ?? [],
    });
    return doc.save();
  }
}

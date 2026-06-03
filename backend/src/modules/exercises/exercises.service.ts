import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Exercise, ExerciseDocument } from '../../common/models/exercise.model';
import { CreateExerciseDto } from './dto/create-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectModel(Exercise.name)
    private readonly exerciseModel: Model<ExerciseDocument>,
  ) {}

  async search(q: string, userId: string): Promise<ExerciseDocument[]> {
    const visibilityCondition = {
      $or: [
        { isGlobal: true as const },
        { createdBy: new Types.ObjectId(userId) },
      ],
    };

    if (q) {
      return this.exerciseModel.find({
        ...visibilityCondition,
        name: { $regex: q, $options: 'i' },
      });
    }

    return this.exerciseModel.find(visibilityCondition);
  }

  async create(
    dto: CreateExerciseDto,
    userId: string,
  ): Promise<ExerciseDocument> {
    return this.exerciseModel.create({
      name: dto.name,
      muscleGroup: dto.muscleGroup ?? null,
      isBodyweight: dto.isBodyweight,
      isGlobal: false,
      createdBy: new Types.ObjectId(userId),
    });
  }
}

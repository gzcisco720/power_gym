import {
  Controller,
  Post,
  Body,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IsNotEmpty, IsString } from 'class-validator';
import { Exercise, ExerciseDocument } from '../../common/models/exercise.model';

class SeedGlobalExerciseDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

/**
 * Dev/test-only routes for E2E test setup.
 * This controller is ONLY registered when NODE_ENV !== 'production'
 * (see exercises.module.ts). It is absent from the production binary.
 */
@Controller('exercises/dev')
export class ExercisesDevController {
  constructor(
    @InjectModel(Exercise.name)
    private readonly exerciseModel: Model<ExerciseDocument>,
  ) {}

  @HttpCode(200)
  @Post('seed-global')
  async seedGlobal(@Body() dto: SeedGlobalExerciseDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }

    await this.exerciseModel.findOneAndUpdate(
      { name: dto.name, isGlobal: true },
      {
        $setOnInsert: {
          name: dto.name,
          muscleGroup: null,
          isGlobal: true,
          createdBy: null,
          imageUrl: null,
          isBodyweight: false,
          equipmentIds: [],
          bodyParts: [],
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    return { ok: true };
  }
}

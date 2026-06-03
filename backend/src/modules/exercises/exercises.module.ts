import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExercisesController } from './exercises.controller';
import { ExercisesDevController } from './exercises.dev.controller';
import { ExercisesService } from './exercises.service';
import { Exercise, ExerciseSchema } from '../../common/models/exercise.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exercise.name, schema: ExerciseSchema },
    ]),
  ],
  controllers: [
    ExercisesController,
    ...(process.env.NODE_ENV !== 'production' ? [ExercisesDevController] : []),
  ],
  providers: [ExercisesService],
})
export class ExercisesModule {}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IExerciseNote,
  EXERCISE_NOTE_MODEL,
} from '../database/models/exercise-note.model';

export interface AppendEntryData {
  memberId: string;
  exerciseId: string;
  exerciseName: string;
  trainerId: string;
  content: string;
  sessionId: string | null;
}

@Injectable()
export class ExerciseNoteRepository {
  constructor(
    @InjectModel(EXERCISE_NOTE_MODEL)
    private readonly model: Model<IExerciseNote>,
  ) {}

  async findByMemberAndExercise(
    memberId: string,
    exerciseId: string,
  ): Promise<IExerciseNote | null> {
    return this.model.findOne({
      memberId: new Types.ObjectId(memberId),
      exerciseId: new Types.ObjectId(exerciseId),
    });
  }

  async appendEntry(data: AppendEntryData): Promise<IExerciseNote | null> {
    const entry = {
      content: data.content,
      sessionId: data.sessionId ? new Types.ObjectId(data.sessionId) : null,
      createdAt: new Date(),
    };
    return this.model.findOneAndUpdate(
      {
        memberId: new Types.ObjectId(data.memberId),
        exerciseId: new Types.ObjectId(data.exerciseId),
      },
      {
        $setOnInsert: {
          exerciseName: data.exerciseName,
          trainerId: new Types.ObjectId(data.trainerId),
        },
        $push: { entries: entry },
      },
      { upsert: true, returnDocument: 'after' },
    );
  }

  async updateEntry(
    noteId: string,
    entryId: string,
    content: string,
  ): Promise<IExerciseNote | null> {
    return this.model.findByIdAndUpdate(
      noteId,
      { $set: { 'entries.$[elem].content': content } },
      {
        arrayFilters: [{ 'elem._id': new Types.ObjectId(entryId) }],
        returnDocument: 'after',
      },
    );
  }
}

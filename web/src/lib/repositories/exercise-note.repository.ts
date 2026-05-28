import mongoose from 'mongoose';
import type { IExerciseNote } from '@/lib/db/models/exercise-note.model';
import { ExerciseNoteModel } from '@/lib/db/models/exercise-note.model';

export interface AppendEntryData {
  memberId: string;
  exerciseId: string;
  exerciseName: string;
  trainerId: string;
  content: string;
  sessionId: string | null;
}

export interface IExerciseNoteRepository {
  findByMemberAndExercise(memberId: string, exerciseId: string): Promise<IExerciseNote | null>;
  appendEntry(data: AppendEntryData): Promise<IExerciseNote | null>;
  updateEntry(noteId: string, entryId: string, content: string): Promise<IExerciseNote | null>;
}

export class MongoExerciseNoteRepository implements IExerciseNoteRepository {
  async findByMemberAndExercise(memberId: string, exerciseId: string): Promise<IExerciseNote | null> {
    return ExerciseNoteModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      exerciseId: new mongoose.Types.ObjectId(exerciseId),
    });
  }

  async appendEntry(data: AppendEntryData): Promise<IExerciseNote | null> {
    const entry = {
      content: data.content,
      sessionId: data.sessionId ? new mongoose.Types.ObjectId(data.sessionId) : null,
      createdAt: new Date(),
    };
    return ExerciseNoteModel.findOneAndUpdate(
      {
        memberId: new mongoose.Types.ObjectId(data.memberId),
        exerciseId: new mongoose.Types.ObjectId(data.exerciseId),
      },
      {
        $setOnInsert: {
          exerciseName: data.exerciseName,
          trainerId: new mongoose.Types.ObjectId(data.trainerId),
        },
        $push: { entries: entry },
      },
      { upsert: true, new: true },
    );
  }

  async updateEntry(noteId: string, entryId: string, content: string): Promise<IExerciseNote | null> {
    return ExerciseNoteModel.findByIdAndUpdate(
      noteId,
      { $set: { 'entries.$[elem].content': content } },
      { arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(entryId) }], new: true },
    );
  }
}

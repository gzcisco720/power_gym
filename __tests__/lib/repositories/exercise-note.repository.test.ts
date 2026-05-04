import mongoose from 'mongoose';
import { MongoExerciseNoteRepository } from '@/lib/repositories/exercise-note.repository';
import { ExerciseNoteModel } from '@/lib/db/models/exercise-note.model';

jest.mock('@/lib/db/models/exercise-note.model', () => ({
  ExerciseNoteModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(ExerciseNoteModel);

const memberId = new mongoose.Types.ObjectId().toString();
const exerciseId = new mongoose.Types.ObjectId().toString();
const noteId = new mongoose.Types.ObjectId().toString();
const entryId = new mongoose.Types.ObjectId().toString();
const trainerId = new mongoose.Types.ObjectId().toString();

describe('MongoExerciseNoteRepository', () => {
  let repo: MongoExerciseNoteRepository;

  beforeEach(() => {
    repo = new MongoExerciseNoteRepository();
    jest.clearAllMocks();
  });

  describe('findByMemberAndExercise', () => {
    it('returns null when no note exists', async () => {
      mockModel.findOne.mockResolvedValue(null as never);
      const result = await repo.findByMemberAndExercise(memberId, exerciseId);
      expect(result).toBeNull();
      expect(mockModel.findOne).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
        exerciseId: expect.any(mongoose.Types.ObjectId),
      });
    });

    it('returns note document when found', async () => {
      const note = { _id: noteId, entries: [] };
      mockModel.findOne.mockResolvedValue(note as never);
      const result = await repo.findByMemberAndExercise(memberId, exerciseId);
      expect(result).toEqual(note);
    });
  });

  describe('appendEntry', () => {
    it('upserts and appends the entry', async () => {
      const updated = { _id: noteId, entries: [{ content: 'Good form' }] };
      (mockModel as unknown as { findOneAndUpdate: jest.Mock }).findOneAndUpdate = jest.fn().mockResolvedValue(updated);

      const result = await repo.appendEntry({
        memberId,
        exerciseId,
        exerciseName: 'Bench Press',
        trainerId,
        content: 'Good form',
        sessionId: null,
      });
      expect(result).toEqual(updated);
    });
  });

  describe('updateEntry', () => {
    it('calls findByIdAndUpdate with arrayFilter', async () => {
      const updated = { _id: noteId, entries: [{ _id: entryId, content: 'Updated' }] };
      mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

      await repo.updateEntry(noteId, entryId, 'Updated');
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        noteId,
        { $set: { 'entries.$[elem].content': 'Updated' } },
        { arrayFilters: [{ 'elem._id': expect.any(mongoose.Types.ObjectId) }], new: true },
      );
    });
  });
});

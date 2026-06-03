jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { apiClient } from './client';
import { searchExercises, createExercise } from './exercises.api';
import { Exercise, CreateExerciseDto } from '../../types/training-templates';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const MOCK_EXERCISE: Exercise = {
  _id: 'ex1',
  name: 'Bench Press',
  muscleGroup: 'Chest',
  isGlobal: true,
  isBodyweight: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('exercises.api', () => {
  describe('searchExercises', () => {
    it('calls GET /exercises with the q query param and returns response data', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_EXERCISE] });

      const result = await searchExercises('bench');

      expect(mockGet).toHaveBeenCalledWith('/exercises', { params: { q: 'bench' } });
      expect(result).toEqual([MOCK_EXERCISE]);
    });

    it('calls GET /exercises with empty q when no query provided', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_EXERCISE] });

      const result = await searchExercises('');

      expect(mockGet).toHaveBeenCalledWith('/exercises', { params: { q: '' } });
      expect(result).toEqual([MOCK_EXERCISE]);
    });
  });

  describe('createExercise', () => {
    it('calls POST /exercises with the dto and returns the created exercise', async () => {
      const dto: CreateExerciseDto = { name: 'Custom Curl', muscleGroup: 'Biceps', isBodyweight: false };
      const created: Exercise = { _id: 'ex2', name: 'Custom Curl', muscleGroup: 'Biceps', isGlobal: false, isBodyweight: false };
      mockPost.mockResolvedValueOnce({ data: created });

      const result = await createExercise(dto);

      expect(mockPost).toHaveBeenCalledWith('/exercises', dto);
      expect(result).toEqual(created);
    });
  });
});

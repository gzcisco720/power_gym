import { labelExercises } from '@/lib/training/label-exercises';

const ex = (exerciseId: string, groupId: string, isSuperset: boolean) => ({
  groupId,
  isSuperset,
  exerciseId,
  exerciseName: exerciseId,
  imageUrl: null,
  isBodyweight: false,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: null,
});

describe('labelExercises', () => {
  it('labels standalone exercises A, B, C in order', () => {
    const result = labelExercises([
      ex('e1', 'g1', false),
      ex('e2', 'g2', false),
      ex('e3', 'g3', false),
    ]);
    expect(result.map((r) => r.label)).toEqual(['A', 'B', 'C']);
  });

  it('labels superset group exercises with shared letter prefix and numeric suffix', () => {
    const result = labelExercises([
      ex('e1', 'g1', false),
      ex('e2', 'grp', true),
      ex('e3', 'grp', true),
      ex('e4', 'g4', false),
    ]);
    expect(result.map((r) => r.label)).toEqual(['A', 'B1', 'B2', 'C']);
  });

  it('handles multiple superset groups', () => {
    const result = labelExercises([
      ex('e1', 'ga', true),
      ex('e2', 'ga', true),
      ex('e3', 'gb', true),
      ex('e4', 'gb', true),
    ]);
    expect(result.map((r) => r.label)).toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  it('returns empty array for empty input', () => {
    expect(labelExercises([])).toEqual([]);
  });
});

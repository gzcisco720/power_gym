import { SelfWorkoutLogModel } from '@/lib/db/models/self-workout-log.model';

describe('SelfWorkoutLogModel', () => {
  it('exposes the expected schema paths', () => {
    const paths = SelfWorkoutLogModel.schema.paths;
    expect(paths.userId.instance).toBe('ObjectId');
    expect(paths.startedAt.instance).toBe('Date');
    expect(paths.completedAt.instance).toBe('Date');
    expect(paths.sourceTemplateId.instance).toBe('ObjectId');
    expect(paths.sourceTemplateDayNumber.instance).toBe('Number');
    expect(paths.dayName.instance).toBe('String');
    expect(paths.rpe.instance).toBe('Number');
    expect(paths.note.instance).toBe('String');
    expect(paths.sets.instance).toBe('Array');
    const setPaths = (paths.sets as { schema: { paths: Record<string, { instance: string }> } }).schema.paths;
    expect(setPaths.exerciseId.instance).toBe('ObjectId');
    expect(setPaths.setNumber.instance).toBe('Number');
  });

  it('declares the indexes used by repo queries', () => {
    const indexes = SelfWorkoutLogModel.schema.indexes();
    const keys = indexes.map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining([
        { userId: 1, startedAt: -1 },
        { userId: 1, completedAt: 1 },
      ]),
    );
  });
});

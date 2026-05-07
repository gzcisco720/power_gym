import { summarizeSession } from '@/lib/training/session-summary';

describe('summarizeSession', () => {
  const baseSet = {
    exerciseId: 'e1',
    exerciseName: 'Bench Press',
    groupId: 'g1',
    isSuperset: false,
    isBodyweight: false,
    setNumber: 1,
    prescribedRepsMin: 8,
    prescribedRepsMax: 12,
    isExtraSet: false,
    actualWeight: null as number | null,
    actualReps: null as number | null,
    completedAt: null as Date | null,
  };

  it('counts unique exercises across sets', () => {
    const summary = summarizeSession({
      _id: 's1',
      dayName: 'Day A',
      startedAt: '2026-05-01T10:00:00Z',
      completedAt: null,
      sets: [
        { ...baseSet, exerciseId: 'e1', exerciseName: 'Bench Press' },
        { ...baseSet, exerciseId: 'e1', exerciseName: 'Bench Press', setNumber: 2 },
        { ...baseSet, exerciseId: 'e2', exerciseName: 'Squat' },
      ],
    });
    expect(summary.exerciseCount).toBe(2);
  });

  it('counts only completed sets toward setCount', () => {
    const summary = summarizeSession({
      _id: 's1',
      dayName: 'Day A',
      startedAt: '2026-05-01T10:00:00Z',
      completedAt: null,
      sets: [
        { ...baseSet, actualWeight: 50, actualReps: 8 },
        { ...baseSet, actualWeight: null, actualReps: null },
        { ...baseSet, actualWeight: 50, actualReps: 6 },
      ],
    });
    expect(summary.setCount).toBe(2);
  });

  it('sums totalVolume = weight × reps across completed sets', () => {
    const summary = summarizeSession({
      _id: 's1',
      dayName: 'Day A',
      startedAt: '2026-05-01T10:00:00Z',
      completedAt: null,
      sets: [
        { ...baseSet, actualWeight: 50, actualReps: 8 },
        { ...baseSet, actualWeight: 60, actualReps: 5 },
        { ...baseSet, actualWeight: null, actualReps: null },
      ],
    });
    expect(summary.totalVolume).toBe(50 * 8 + 60 * 5);
  });

  it('returns zeros for empty session', () => {
    const summary = summarizeSession({
      _id: 's1',
      dayName: 'Day A',
      startedAt: '2026-05-01T10:00:00Z',
      completedAt: null,
      sets: [],
    });
    expect(summary).toMatchObject({ exerciseCount: 0, setCount: 0, totalVolume: 0 });
  });

  it('preserves _id, dayName, startedAt, completedAt unchanged', () => {
    const summary = summarizeSession({
      _id: 's1',
      dayName: 'Day A',
      startedAt: '2026-05-01T10:00:00Z',
      completedAt: '2026-05-01T11:00:00Z',
      sets: [],
    });
    expect(summary).toMatchObject({
      _id: 's1',
      dayName: 'Day A',
      startedAt: '2026-05-01T10:00:00Z',
      completedAt: '2026-05-01T11:00:00Z',
    });
  });
});

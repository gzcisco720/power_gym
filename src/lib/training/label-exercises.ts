const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface ExerciseIn {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

export type LabelledExercise = ExerciseIn & { label: string };

export function labelExercises(exercises: ExerciseIn[]): LabelledExercise[] {
  let letterIdx = 0;
  const groupLabels = new Map<string, string>();
  const groupCounters = new Map<string, number>();

  return exercises.map((ex) => {
    if (!ex.isSuperset) {
      const label = LETTERS[letterIdx++] ?? `EX${letterIdx}`;
      return { ...ex, label };
    }
    if (!groupLabels.has(ex.groupId)) {
      groupLabels.set(ex.groupId, LETTERS[letterIdx++] ?? `EX${letterIdx}`);
      groupCounters.set(ex.groupId, 1);
    }
    const prefix = groupLabels.get(ex.groupId)!;
    const num = groupCounters.get(ex.groupId)!;
    groupCounters.set(ex.groupId, num + 1);
    return { ...ex, label: `${prefix}${num}` };
  });
}

import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';

interface SessionSet {
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
}

interface SessionDetail {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  rpe: number | null;
  memberNote: string | null;
  sets: SessionSet[];
}

interface SessionDetailPanelProps {
  session: SessionDetail;
}

interface ExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  sets: { setNumber: number; actualWeight: number | null; actualReps: number | null }[];
}

function buildExerciseSummaries(sets: SessionSet[]): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary>();
  for (const s of sets) {
    if (!map.has(s.exerciseId)) {
      map.set(s.exerciseId, { exerciseId: s.exerciseId, exerciseName: s.exerciseName, imageUrl: s.imageUrl, sets: [] });
    }
    if (s.completedAt) {
      map.get(s.exerciseId)!.sets.push({ setNumber: s.setNumber, actualWeight: s.actualWeight, actualReps: s.actualReps });
    }
  }
  return Array.from(map.values());
}

function durationMinutes(start: string, end: string | null) {
  if (!end) return null;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

export function SessionDetailPanel({ session }: SessionDetailPanelProps) {
  const exercises = buildExerciseSummaries(session.sets);
  const duration = durationMinutes(session.startedAt, session.completedAt);

  return (
    <div className="bg-[#0c0c0c] border border-[#141414] rounded-xl p-4 space-y-4">
      <div>
        <div className="text-[10px] text-[#555] mb-0.5">
          {new Date(session.completedAt ?? session.startedAt).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
          })}
        </div>
        <div className="text-[16px] font-bold text-white">{session.dayName}</div>
        <div className="flex gap-3 mt-1">
          {duration !== null && <span className="text-[10px] text-[#555]">{duration} min</span>}
          {session.rpe && <span className="text-[10px] text-[#555]">RPE {session.rpe}</span>}
        </div>
      </div>

      <div className="space-y-3">
        {exercises.map((ex) => (
          <div key={ex.exerciseId} className="flex items-start gap-3">
            <ExerciseThumbnail imageUrl={ex.imageUrl} name={ex.exerciseName} size={40} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-white mb-1">{ex.exerciseName}</div>
              <div className="flex flex-wrap gap-1.5">
                {ex.sets.map((s) => (
                  <span key={s.setNumber} className="text-[9px] text-[#666] bg-[#141414] rounded px-1.5 py-0.5">
                    {s.actualWeight !== null ? `${s.actualWeight}kg × ` : ''}{s.actualReps ?? '–'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {session.memberNote && (
        <div className="border-t border-[#141414] pt-3">
          <div className="text-[9px] text-[#555] mb-1">Note</div>
          <div className="text-[11px] text-[#888]">{session.memberNote}</div>
        </div>
      )}
    </div>
  );
}

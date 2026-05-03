'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';
import { ExerciseBadge } from '@/components/training/exercise-badge';
import { labelExercises } from '@/lib/training/label-exercises';
import { cn } from '@/lib/utils';

interface PlanDayExercise {
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

interface PlanDay {
  dayNumber: number;
  name: string;
  exercises: PlanDayExercise[];
}

interface Plan {
  _id: string;
  name: string;
  days: PlanDay[];
}

interface Props {
  plan: Plan | null;
  sessionBasePath?: string;
}

export function PlanOverview({ plan, sessionBasePath = '/member/plan' }: Props) {
  const [activeDay, setActiveDay] = useState<number>(plan?.days[0]?.dayNumber ?? 1);

  if (!plan) {
    return (
      <div className="px-4 sm:px-8 py-28">
        <EmptyState
          heading="No plan assigned"
          description="Your trainer hasn't assigned a training plan yet. Check back soon."
        />
      </div>
    );
  }

  const currentDay = plan.days.find((d) => d.dayNumber === activeDay) ?? plan.days[0];
  const labelled = labelExercises(currentDay?.exercises ?? []);

  type LabelledEx = (typeof labelled)[number];
  type StandaloneGroup = { type: 'standalone'; exercise: LabelledEx };
  type SupersetGroup = { type: 'superset'; groupId: string; exercises: LabelledEx[] };
  type ExerciseGroup = StandaloneGroup | SupersetGroup;

  const exerciseGroups: ExerciseGroup[] = [];
  const seenGroupIds = new Set<string>();

  for (const ex of labelled) {
    if (!ex.isSuperset) {
      exerciseGroups.push({ type: 'standalone', exercise: ex });
    } else {
      if (!seenGroupIds.has(ex.groupId)) {
        seenGroupIds.add(ex.groupId);
        const groupExercises = labelled.filter((e) => e.groupId === ex.groupId && e.isSuperset);
        exerciseGroups.push({ type: 'superset', groupId: ex.groupId, exercises: groupExercises });
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Plan name header */}
      <div className="px-4 sm:px-8 pt-6 pb-3 border-b border-[#0f0f0f]">
        <div className="text-[10px] font-semibold uppercase tracking-[2px] text-[#555] mb-0.5">Training Plan</div>
        <div className="text-[18px] font-bold text-white">{plan.name}</div>
      </div>

      {/* Day tab strip */}
      <div className="border-b border-[#0f0f0f] overflow-x-auto scrollbar-none">
        <div className="flex min-w-max px-4 sm:px-8">
          {plan.days.map((day) => (
            <button
              key={day.dayNumber}
              onClick={() => setActiveDay(day.dayNumber)}
              className={cn(
                'flex flex-col items-start py-3 pr-6 text-left shrink-0 border-b-2 transition-colors',
                activeDay === day.dayNumber
                  ? 'border-white text-white'
                  : 'border-transparent text-[#555] hover:text-[#888]',
              )}
            >
              <span className="text-[9px] font-semibold uppercase tracking-[1.5px]">
                Day {day.dayNumber}
              </span>
              <span className="text-[12px] font-medium mt-0.5">{day.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 pb-24 space-y-3">
        {exerciseGroups.length === 0 && (
          <p className="text-[12px] text-[#555]">No exercises in this day.</p>
        )}

        {exerciseGroups.map((group) => {
          const groupKey = group.type === 'standalone' ? group.exercise.exerciseId : group.groupId;
          if (group.type === 'standalone') {
            const ex = group.exercise;
            return (
              <div key={groupKey} className="flex items-center gap-3 rounded-xl bg-[#0c0c0c] border border-[#141414] p-3">
                <ExerciseThumbnail imageUrl={ex.imageUrl} name={ex.exerciseName} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ExerciseBadge label={ex.label} />
                    <span className="text-[13px] font-semibold text-white truncate">{ex.exerciseName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] text-[#555] bg-[#141414] rounded px-2 py-0.5">Sets: {ex.sets}</span>
                    <span className="text-[10px] text-[#555] bg-[#141414] rounded px-2 py-0.5">
                      {ex.repsMin === ex.repsMax ? `${ex.repsMin} reps` : `${ex.repsMin}–${ex.repsMax} reps`}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // Superset group
          return (
            <div key={groupKey} className="rounded-xl border border-[#2a2a2a] overflow-hidden">
              <div className="flex justify-center py-1.5 bg-[#111]">
                <span className="text-[9px] font-bold uppercase tracking-[2px] text-[#666]">Superset</span>
              </div>
              {group.exercises.map((ex, j) => (
                <div key={ex.exerciseId}>
                  {j > 0 && <div className="h-px bg-[#141414]" />}
                  <div className="flex items-center gap-3 bg-[#0c0c0c] p-3">
                    <ExerciseThumbnail imageUrl={ex.imageUrl} name={ex.exerciseName} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ExerciseBadge label={ex.label} />
                        <span className="text-[12px] font-semibold text-white truncate">{ex.exerciseName}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-[#555] bg-[#141414] rounded px-2 py-0.5">Sets: {ex.sets}</span>
                        <span className="text-[10px] text-[#555] bg-[#141414] rounded px-2 py-0.5">
                          {ex.repsMin === ex.repsMax ? `${ex.repsMin} reps` : `${ex.repsMin}–${ex.repsMax} reps`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[220px] border-t border-[#0f0f0f] bg-[#050505] px-4 sm:px-8 py-3">
        <a
          href={`${sessionBasePath}/session/new?day=${activeDay}`}
          className="flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-[13px] font-bold text-black hover:bg-white/90 transition-colors"
        >
          Log This Workout
        </a>
      </div>
    </div>
  );
}

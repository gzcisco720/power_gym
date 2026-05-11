'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';
import { ExerciseBadge } from '@/components/training/exercise-badge';
import { ActiveSessionPrompt } from '@/components/shared/active-session-prompt';
import { labelExercises } from '@/lib/training/label-exercises';
import { cn } from '@/lib/utils';
import { ActiveSessionConflictDialog } from '@/components/self-tracking/active-session-conflict-dialog';
import { DayAlreadyLoggedDialog } from '@/components/self-tracking/day-already-logged-dialog';

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

interface ActivePromptInfo {
  sessionId: string;
  dayName: string;
  startedAtIso: string;
  lastActivityAtIso: string;
}

interface Props {
  plan: Plan | null;
  sessionBasePath?: string;
  activePrompt?: ActivePromptInfo | null;
}

export function PlanOverview({
  plan,
  sessionBasePath = '/member/plan',
  activePrompt,
}: Props) {
  const [activeDay, setActiveDay] = useState<number>(plan?.days[0]?.dayNumber ?? 1);
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [conflict, setConflict] = useState<{
    _id: string;
    dayName: string;
    dayNumber: number;
    setCount: number;
  } | null>(null);
  const [dayAlreadyLogged, setDayAlreadyLogged] = useState<{
    _id: string;
    dayName: string;
  } | null>(null);

  async function startSession(dayNum: number, deleteActive = false) {
    if (!plan) return;
    setStarting(true);
    try {
      const url = deleteActive ? '/api/sessions?deleteActive=true' : '/api/sessions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberPlanId: plan._id, dayNumber: dayNum }),
      });
      if (res.ok) {
        const data = (await res.json()) as { _id: string };
        router.push(`${sessionBasePath}/session/${data._id}`);
        return;
      }
      if (res.status === 409) {
        const body = (await res.json()) as {
          error: string;
          activeSession?: { _id: string; dayName: string; dayNumber: number; setCount: number };
          session?: { _id: string; dayName: string };
        };
        if (body.error === 'ACTIVE_SESSION_EXISTS' && body.activeSession) {
          setConflict(body.activeSession);
        } else if (body.error === 'DAY_ALREADY_LOGGED' && body.session) {
          setDayAlreadyLogged(body.session);
        }
      }
    } finally {
      setStarting(false);
    }
  }

  if (!plan) {
    return (
      <div className="px-4 sm:px-8 py-28">
        {activePrompt && (
          <div className="mb-6 max-w-2xl mx-auto">
            <ActiveSessionPrompt
              dayName={activePrompt.dayName}
              startedAtIso={activePrompt.startedAtIso}
              lastActivityAtIso={activePrompt.lastActivityAtIso}
              continueHref={`${sessionBasePath}/session/${activePrompt.sessionId}`}
              sealEndpoint={`/api/sessions/${activePrompt.sessionId}/seal`}
              deleteEndpoint={`/api/sessions/${activePrompt.sessionId}`}
            />
          </div>
        )}
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
      {activePrompt && (
        <div className="px-4 sm:px-8 pt-4">
          <ActiveSessionPrompt
            dayName={activePrompt.dayName}
            startedAtIso={activePrompt.startedAtIso}
            lastActivityAtIso={activePrompt.lastActivityAtIso}
            continueHref={`${sessionBasePath}/session/${activePrompt.sessionId}`}
            sealEndpoint={`/api/sessions/${activePrompt.sessionId}/seal`}
            deleteEndpoint={`/api/sessions/${activePrompt.sessionId}`}
          />
        </div>
      )}
      <div className="px-4 sm:px-8 pt-6 pb-3 border-b border-[#0f0f0f]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[2px] text-[#555] mb-0.5">Training Plan</div>
            <div className="text-[18px] font-bold text-white">{plan.name}</div>
          </div>
          <a
            href={`${sessionBasePath}/calendar`}
            className="flex items-center gap-1.5 text-[11px] text-[#555] hover:text-[#888] border border-[#1e1e1e] rounded-lg px-3 py-1.5 transition-colors"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Calendar</span>
          </a>
        </div>
      </div>

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

      <div className="fixed bottom-0 left-0 right-0 lg:left-[220px] border-t border-[#0f0f0f] bg-[#050505] px-4 sm:px-8 py-3">
        <button
          disabled={starting}
          onClick={() => startSession(activeDay)}
          className="flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-[13px] font-bold text-black hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {starting ? 'Starting…' : 'Log This Workout'}
        </button>
      </div>

      {conflict && (
        <ActiveSessionConflictDialog
          open
          dayName={conflict.dayName}
          setCount={conflict.setCount}
          resumeHref={`${sessionBasePath}/session/${conflict._id}`}
          onDeleteAndStart={() => {
            const dayNum = conflict.dayNumber;
            setConflict(null);
            void startSession(dayNum, true);
          }}
          onClose={() => setConflict(null)}
        />
      )}

      {dayAlreadyLogged && (
        <DayAlreadyLoggedDialog
          open
          dayName={dayAlreadyLogged.dayName}
          sessionId={dayAlreadyLogged._id}
          basePath="/member/plan"
          onClose={() => setDayAlreadyLogged(null)}
        />
      )}
    </div>
  );
}

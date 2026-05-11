'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ActiveSessionConflictDialog } from './active-session-conflict-dialog';
import { DayAlreadyLoggedDialog } from './day-already-logged-dialog';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

type BasePath = '/trainer/my-training' | '/owner/my-training';

export interface UserTemplateExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
}
export interface UserTemplateDay {
  dayNumber: number;
  name: string;
  exercises: UserTemplateExercise[];
}
export interface UserTemplate {
  _id: string;
  name: string;
  days: UserTemplateDay[];
}

interface Props {
  templates: UserTemplate[];
  basePath: BasePath;
}

interface ConflictInfo {
  _id: string;
  dayName: string;
  setCount: number;
}

interface PendingLog {
  template: UserTemplate;
  day: UserTemplateDay;
}

export function TemplatePathCard({ templates, basePath }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(
    templates.length === 1 ? templates[0]._id : null,
  );
  const [starting, setStarting] = useState(false);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [pending, setPending] = useState<PendingLog | null>(null);
  const [dayAlreadyLogged, setDayAlreadyLogged] = useState<{
    _id: string;
    dayName: string;
  } | null>(null);

  async function handleLog(template: UserTemplate, day: UserTemplateDay, deleteActive = false) {
    setStarting(true);
    try {
      const url = deleteActive
        ? '/api/me/workout-logs?deleteActive=true'
        : '/api/me/workout-logs';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayName: day.name,
          sourceTemplateId: template._id,
          sourceTemplateDayNumber: day.dayNumber,
          plannedSets: buildPlannedSets(day),
        }),
      });
      if (res.ok) {
        const log = (await res.json()) as { _id: string };
        router.push(`${basePath}/session/${log._id}`);
        return;
      }
      if (res.status === 409) {
        const body = (await res.json()) as {
          error: string;
          activeSession?: ConflictInfo;
          session?: { _id: string; dayName: string };
        };
        if (body.error === 'ACTIVE_SESSION_EXISTS' && body.activeSession) {
          setConflict(body.activeSession);
          setPending({ template, day });
        } else if (body.error === 'DAY_ALREADY_LOGGED' && body.session) {
          setDayAlreadyLogged(body.session);
        }
      }
    } finally {
      setStarting(false);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
            From Template
          </span>
        </div>
        <p className="text-sm text-foreground/65 mb-4 flex-1">
          Create a training template to log structured workouts.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push(basePath.replace('/my-training', '/plans/new'))}
        >
          + Create Template
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
            From Template
          </span>
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">
            Pick any day
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {templates.map((tpl) => {
            const isExpanded = expandedId === tpl._id;
            return (
              <div key={tpl._id} className="rounded-lg ring-1 ring-foreground/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : tpl._id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-foreground/5 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold">{tpl.name}</div>
                    <div className="text-[10px] text-foreground/65">
                      {tpl.days.length} day{tpl.days.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <span className="text-foreground/40 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="border-t border-foreground/10 bg-foreground/[0.02] px-2 py-1.5 flex flex-col gap-1">
                    {tpl.days.map((day) => (
                      <div
                        key={day.dayNumber}
                        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-foreground/5"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-[12px] font-medium">{day.name}</span>
                          {day.exercises.length > 0 && (
                            <span className="text-[10px] text-foreground/50 ml-2 truncate">
                              {day.exercises
                                .slice(0, 3)
                                .map((e) => e.exerciseName)
                                .join(' · ')}
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={starting}
                          onClick={() => handleLog(tpl, day)}
                          className="h-6 px-2 text-[11px] shrink-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        >
                          Log
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {conflict && pending && (
        <ActiveSessionConflictDialog
          open
          dayName={conflict.dayName}
          setCount={conflict.setCount}
          resumeHref={`${basePath}/session/${conflict._id}`}
          onDeleteAndStart={() => {
            const { template, day } = pending;
            setConflict(null);
            setPending(null);
            void handleLog(template, day, true);
          }}
          onClose={() => {
            setConflict(null);
            setPending(null);
          }}
        />
      )}
      {dayAlreadyLogged && (
        <DayAlreadyLoggedDialog
          open
          dayName={dayAlreadyLogged.dayName}
          sessionId={dayAlreadyLogged._id}
          basePath={basePath}
          onClose={() => setDayAlreadyLogged(null)}
        />
      )}
    </>
  );
}

function buildPlannedSets(day: UserTemplateDay): ISelfWorkoutSet[] {
  return day.exercises.flatMap((ex) =>
    Array.from({ length: ex.sets }, (_, i) => ({
      exerciseId: ex.exerciseId as unknown as ISelfWorkoutSet['exerciseId'],
      exerciseName: ex.exerciseName,
      groupId: ex.groupId,
      isSuperset: ex.isSuperset,
      isBodyweight: ex.isBodyweight,
      setNumber: i + 1,
      prescribedRepsMin: ex.repsMin,
      prescribedRepsMax: ex.repsMax,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    })),
  );
}

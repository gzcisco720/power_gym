'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ActiveSessionConflictDialog } from './active-session-conflict-dialog';
import { DayAlreadyLoggedDialog } from './day-already-logged-dialog';
import { buildPlannedSets } from './build-planned-sets';

type BasePath = '/member/my-training';

export interface MemberPlanExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
}

export interface MemberPlanDay {
  dayNumber: number;
  name: string;
  exercises: MemberPlanExercise[];
}

export interface MemberPlan {
  _id: string;
  templateId: string;
  name: string;
  days: MemberPlanDay[];
}

interface Props {
  plan: MemberPlan | null;
  basePath: BasePath;
}

interface ConflictInfo {
  _id: string;
  dayName: string;
  setCount: number;
}

export function MemberPlanPathCard({ plan, basePath }: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [pendingDay, setPendingDay] = useState<MemberPlanDay | null>(null);
  const [dayAlreadyLogged, setDayAlreadyLogged] = useState<{
    _id: string;
    dayName: string;
  } | null>(null);

  async function handleLog(day: MemberPlanDay, deleteActive = false) {
    if (!plan) return;
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
          sourceTemplateId: plan.templateId,
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
          setPendingDay(day);
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
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
            Training Plan
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
          <span className="text-3xl opacity-35">📋</span>
          <p className="text-sm text-foreground/65">No training plan assigned yet.</p>
          <p className="text-xs text-foreground/40">Ask your trainer to assign a plan.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
            Training Plan
          </span>
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">
            Pick any day
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">{plan.name}</span>
          <span className="text-[10px] text-foreground/50">
            {plan.days.length} day{plan.days.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {plan.days.map((day) => (
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
                onClick={() => handleLog(day)}
                className="h-6 px-2 text-[11px] shrink-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                Log
              </Button>
            </div>
          ))}
        </div>
      </div>

      {conflict && pendingDay && (
        <ActiveSessionConflictDialog
          open
          dayName={conflict.dayName}
          setCount={conflict.setCount}
          resumeHref={`${basePath}/session/${conflict._id}`}
          onDeleteAndStart={() => {
            const day = pendingDay;
            setConflict(null);
            setPendingDay(null);
            void handleLog(day, true);
          }}
          onClose={() => {
            setConflict(null);
            setPendingDay(null);
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

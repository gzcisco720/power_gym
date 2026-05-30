'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ActiveSessionConflictDialog } from './active-session-conflict-dialog';
import { DayAlreadyLoggedDialog } from './day-already-logged-dialog';

type BasePath = '/trainer/my-training' | '/owner/my-training' | '/member/my-training';

interface TopSet {
  exerciseName: string;
  weight: number | null;
  reps: number | null;
  isPR: boolean;
}
interface LastFreestyle {
  dateLabel: string;
  durationMin: number;
  rpe: number | null;
  topSets: TopSet[];
  remainingSets: number;
}
interface FullProps {
  state: 'full';
  lastFreestyle: LastFreestyle;
  weeklyFrequency: number;
  basePath: BasePath;
}
interface LightProps {
  state: 'light';
  lastFreestyle: LastFreestyle;
  basePath: BasePath;
}
interface EmptyProps {
  state: 'empty';
  basePath: BasePath;
}
type Props = FullProps | LightProps | EmptyProps;

export function FreestylePathCard(props: Props) {
  const { push } = useRouter();
  const [starting, setStarting] = useState(false);
  const [conflict, setConflict] = useState<{
    _id: string;
    dayName: string;
    setCount: number;
  } | null>(null);
  const [dayAlreadyLogged, setDayAlreadyLogged] = useState<{
    _id: string;
    dayName: string;
  } | null>(null);

  async function startBlank(deleteActive = false) {
    setStarting(true);
    try {
      const url = deleteActive
        ? '/api/me/workout-logs?deleteActive=true'
        : '/api/me/workout-logs';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayName: 'Freestyle', plannedSets: [] }),
      });
      if (res.ok) {
        const log = (await res.json()) as { _id: string };
        push(`${props.basePath}/session/${log._id}`);
        return;
      }
      if (res.status === 409) {
        const body = (await res.json()) as {
          error: string;
          activeSession?: { _id: string; dayName: string; setCount: number };
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

  return (
    <>
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-sky-300">
          {props.state === 'empty' ? 'No plan, no pressure' : 'Log on the fly'}
        </span>
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">Freestyle</span>
      </div>
      <div className="mb-1">
        <div className="text-[11px] text-foreground/65">
          {props.state === 'empty' ? ' ' : 'No template, no plan'}
        </div>
        <h2 className="text-xl font-semibold leading-tight mt-0.5">Blank session</h2>
      </div>
      <div className="text-xs text-foreground/65 mb-3">
        {props.state === 'empty'
          ? "Best when you don't know exactly what you'll do, or you just want to log what happens."
          : 'Pick exercises as you go. Save it as a template later if you want.'}
      </div>

      {props.state === 'empty' ? (
        <div className="rounded-lg ring-1 ring-foreground/10 p-2.5 mb-3 bg-foreground/5 space-y-1.5">
          <Bullet>Pick exercises on the fly</Bullet>
          <Bullet>Save as a template afterward</Bullet>
          <Bullet>RPE + note when you&apos;re done</Bullet>
        </div>
      ) : (
        <div className="rounded-lg ring-1 ring-foreground/10 p-2.5 mb-3 bg-foreground/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">
              Your last freestyle
            </span>
            <span className="text-[11px] text-foreground/65 tabular-nums">
              {props.lastFreestyle.dateLabel} · {props.lastFreestyle.durationMin} min
              {props.lastFreestyle.rpe != null ? ` · RPE ${props.lastFreestyle.rpe}` : ''}
            </span>
          </div>
          <div className="space-y-1.5">
            {props.lastFreestyle.topSets.map((s) => (
              <div key={s.exerciseName} className="flex items-center justify-between text-[12px] tabular-nums">
                <span>{s.exerciseName}</span>
                <span className="text-foreground/65">
                  {s.weight != null && s.reps != null ? `${s.weight} kg × ${s.reps}` : '—'}
                </span>
                {props.state === 'full' && s.isPR ? (
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30">
                    PR
                  </span>
                ) : (
                  <span className="text-[9px] text-foreground/30">·</span>
                )}
              </div>
            ))}
            {props.lastFreestyle.remainingSets > 0 && (
              <div className="text-[12px] text-foreground/65 italic">
                + {props.lastFreestyle.remainingSets} more sets
              </div>
            )}
          </div>
        </div>
      )}

      {props.state === 'full' && (
        <div className="text-[11px] text-foreground/65 mb-3 tabular-nums">
          Recent freestyle frequency: <span className="text-foreground">{props.weeklyFrequency} / week</span>
        </div>
      )}

      <div className="mt-auto">
        <Button onClick={() => startBlank()} disabled={starting} className="w-full">
          {starting ? 'Starting…' : 'Start blank →'}
        </Button>
      </div>
    </div>
    {conflict && (
      <ActiveSessionConflictDialog
        open
        dayName={conflict.dayName}
        setCount={conflict.setCount}
        resumeHref={`${props.basePath}/session/${conflict._id}`}
        onDeleteAndStart={() => {
          setConflict(null);
          void startBlank(true);
        }}
        onClose={() => setConflict(null)}
      />
    )}
    {dayAlreadyLogged && (
      <DayAlreadyLoggedDialog
        open
        dayName={dayAlreadyLogged.dayName}
        sessionId={dayAlreadyLogged._id}
        basePath={props.basePath}
        onClose={() => setDayAlreadyLogged(null)}
        onDeleteLog={async () => {
          const res = await fetch(`/api/me/workout-logs/${dayAlreadyLogged._id}`, { method: 'DELETE' });
          if (!res.ok) { toast.error('Failed to delete log. Please try again.'); return; }
          setDayAlreadyLogged(null);
          toast.success('Previous log deleted. You can now re-log.');
        }}
      />
    )}
    </>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="size-1 rounded-full bg-sky-400/70" />
      <span>{children}</span>
    </div>
  );
}

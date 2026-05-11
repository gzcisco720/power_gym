'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type BasePath = '/trainer/my-training' | '/owner/my-training';

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
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [showOverwrite, setShowOverwrite] = useState(false);
  const [conflictDayName, setConflictDayName] = useState<string | null>(null);

  async function startBlank(overwrite = false) {
    setStarting(true);
    try {
      const url = overwrite ? '/api/me/workout-logs?overwrite=true' : '/api/me/workout-logs';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayName: 'Freestyle', plannedSets: [] }),
      });
      if (res.ok) {
        const log = (await res.json()) as { _id: string };
        router.push(`${props.basePath}/session/${log._id}`);
        return;
      }
      if (res.status === 409) {
        const body = (await res.json()) as { error: string; existingLog?: { dayName: string } };
        if (body.error === 'TODAY_ALREADY_LOGGED') {
          setConflictDayName(body.existingLog?.dayName ?? null);
          setShowOverwrite(true);
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
        <h2 className="text-xl font-bold leading-tight mt-0.5">Blank session</h2>
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
            {props.lastFreestyle.topSets.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[12px] tabular-nums">
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
    <Dialog open={showOverwrite} onOpenChange={setShowOverwrite}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>今天已有打卡记录</DialogTitle>
          <DialogDescription>
            你今天已记录了「{conflictDayName ?? ''}」。继续将删除这条记录并创建新记录。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowOverwrite(false)}>
            取消
          </Button>
          <Button
            onClick={() => {
              setShowOverwrite(false);
              void startBlank(true);
            }}
          >
            覆盖并继续
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-1 h-1 rounded-full bg-sky-400/70" />
      <span>{children}</span>
    </div>
  );
}

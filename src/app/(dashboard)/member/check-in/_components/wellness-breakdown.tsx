'use client';

import type { CheckInRecord } from '@/lib/check-in-stats';
import { avgWellnessScore } from '@/lib/check-in-stats';
import { format } from 'date-fns';

interface Props {
  checkIn: CheckInRecord | null;
}

type WellnessField = {
  label: string;
  value: number;
  inverted: boolean; // lower is better (stress, fatigue)
};

function fieldColour(value: number, inverted: boolean): string {
  const effective = inverted ? 11 - value : value;
  if (effective >= 7) return 'bg-primary';
  if (effective >= 5) return 'bg-amber-400';
  return 'bg-red-400';
}

function valueColour(value: number, inverted: boolean): string {
  const effective = inverted ? 11 - value : value;
  if (effective >= 7) return 'text-primary-light';
  if (effective >= 5) return 'text-amber-400';
  return 'text-red-400';
}

export function WellnessBreakdown({ checkIn }: Props) {
  if (!checkIn) return null;

  const fields: WellnessField[] = [
    { label: 'Sleep', value: checkIn.sleepQuality, inverted: false },
    { label: 'Energy', value: checkIn.energy, inverted: false },
    { label: 'Recovery', value: checkIn.recovery, inverted: false },
    { label: 'Digestion', value: checkIn.digestion, inverted: false },
    { label: 'Hunger', value: checkIn.hunger, inverted: false },
    { label: 'Stress ↓', value: checkIn.stress, inverted: true },
    { label: 'Fatigue ↓', value: checkIn.fatigue, inverted: true },
  ];

  const avg = avgWellnessScore(checkIn);
  const date = format(new Date(checkIn.submittedAt), 'd MMM');

  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-[13px] border-b border-foreground/5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/65">
          Wellness Breakdown
        </span>
        <span className="text-[11px] text-primary-light">Last check-in · {date}</span>
      </div>

      <div className="flex">
        {/* Radar — hidden on mobile */}
        <div className="hidden md:flex flex-col items-center justify-center gap-1.5 p-4 w-40 flex-shrink-0">
          <svg width="100" height="100" viewBox="-50 -50 100 100" aria-hidden="true">
            {[40, 27, 14].map((r, i) => (
              <polygon
                key={i}
                points={hexPoints(r)}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            ))}
            {hexAxes().map((line, i) => (
              <line
                key={i}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.5"
              />
            ))}
            <polygon
              points={radarPoints(fields)}
              fill="rgba(99,102,241,0.18)"
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-[22px] font-bold text-primary-light leading-none">{avg}</div>
          <div className="text-[10px] text-foreground/35">Overall · {date}</div>
        </div>

        {/* Bars */}
        <div className="flex-1 flex flex-col gap-[7px] px-[18px] py-3.5">
          {fields.map(({ label, value, inverted }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[11px] text-foreground/65 w-[72px]">{label}</span>
              <div className="flex-1 h-1.5 bg-foreground/[0.07] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${fieldColour(value, inverted)}`}
                  style={{ width: `${value * 10}%` }}
                />
              </div>
              <span
                className={`text-[11px] font-semibold w-5 text-right ${valueColour(
                  value,
                  inverted
                )}`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Radar helpers ──
function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${r * Math.cos(a)},${r * Math.sin(a)}`;
  }).join(' ');
}

function hexAxes(): { x1: number; y1: number; x2: number; y2: number }[] {
  return Array.from({ length: 3 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const r = 40;
    return {
      x1: r * Math.cos(a),
      y1: r * Math.sin(a),
      x2: -r * Math.cos(a),
      y2: -r * Math.sin(a),
    };
  });
}

function radarPoints(fields: WellnessField[]): string {
  return fields
    .slice(0, 6)
    .map(({ value, inverted }, i) => {
      const effective = inverted ? 11 - value : value;
      const r = (effective / 10) * 40;
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${r * Math.cos(a)},${r * Math.sin(a)}`;
    })
    .join(' ');
}

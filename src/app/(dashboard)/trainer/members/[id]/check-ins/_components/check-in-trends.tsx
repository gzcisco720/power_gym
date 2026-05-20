'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import type { ICheckIn } from '@/lib/db/models/check-in.model';

interface Props {
  checkIns: ICheckIn[];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatShortDate(d: Date | string): string {
  const date = new Date(d);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

const DIET_COLOR: Record<string, string> = {
  yes: 'bg-emerald-500',
  partial: 'bg-amber-500',
  no: 'bg-rose-500',
};
const DIET_LABEL: Record<string, string> = {
  yes: 'Stuck to diet',
  partial: 'Partial',
  no: 'Off track',
};

export function CheckInTrends({ checkIns }: Props) {
  if (checkIns.length === 0) return null;

  // Wellness score: last 12 check-ins, oldest→newest for L→R display
  const scoreData = [...checkIns]
    .slice(0, 12)
    .reverse()
    .map((ci) => ({
      date: formatShortDate(ci.submittedAt),
      avg: parseFloat(
        (
          (ci.sleepQuality + ci.energy + ci.recovery + ci.stress + ci.fatigue + ci.hunger + ci.digestion) /
          7
        ).toFixed(1),
      ),
    }));

  // Diet compliance: last 16 check-ins, oldest→newest
  const complianceData = [...checkIns].slice(0, 16).reverse();

  return (
    <div className="px-4 sm:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Wellness score */}
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/65 mb-3">
            Avg Wellness Score
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height={144}>
              <LineChart data={scoreData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: 'currentColor' }}
                  className="text-foreground/50"
                  stroke="currentColor"
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fontSize: 9, fill: 'currentColor' }}
                  className="text-foreground/50"
                  stroke="currentColor"
                  width={20}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(value) => [`${value}/10`, 'Avg score']}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="rgb(99 102 241)"
                  strokeWidth={2}
                  dot={{ fill: 'rgb(99 102 241)', r: 2.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diet compliance */}
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/65 mb-3">
            Diet Compliance
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {complianceData.map((ci, i) => (
              <div
                key={i}
                title={`${formatShortDate(ci.submittedAt)}: ${DIET_LABEL[ci.stuckToDiet]}`}
                className={`w-5 h-5 rounded-sm ${DIET_COLOR[ci.stuckToDiet] ?? 'bg-muted'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-[10px] text-foreground/50">Stuck</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-500" />
              <span className="text-[10px] text-foreground/50">Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-rose-500" />
              <span className="text-[10px] text-foreground/50">Off track</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

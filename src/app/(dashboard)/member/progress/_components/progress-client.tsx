'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { SectionHeader } from '@/components/shared/section-header';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

interface ProgressClientProps {
  heatmapData: { date: string }[];
  exercises: { exerciseId: string; exerciseName: string }[];
  memberId: string;
  title?: string;
}

interface HistoryPoint {
  date: string;
  estimatedOneRM: number;
}

function buildHeatmapWeeks(activeDates: Set<string>): {
  monthLabel: string | null;
  weekKey: string;
  days: { inRange: boolean; hasSession: boolean }[];
}[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysSinceMonday);

  const startMonday = new Date(thisMonday);
  startMonday.setDate(thisMonday.getDate() - 12 * 7);

  const since = new Date(today);
  since.setDate(today.getDate() - 90);

  const weeks: { monthLabel: string | null; weekKey: string; days: { inRange: boolean; hasSession: boolean }[] }[] = [];
  let prevMonth = -1;

  for (let w = 0; w < 13; w++) {
    const weekMonday = new Date(startMonday);
    weekMonday.setDate(startMonday.getDate() + w * 7);

    const month = weekMonday.getMonth();
    const monthLabel =
      month !== prevMonth
        ? weekMonday.toLocaleDateString('en-US', { month: 'short' })
        : null;
    prevMonth = month;

    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekMonday);
      date.setDate(weekMonday.getDate() + d);
      const inRange = date >= since && date <= today;
      const y = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const d2 = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${mo}-${d2}`;
      days.push({ inRange, hasSession: inRange && activeDates.has(dateStr) });
    }
    weeks.push({ monthLabel, weekKey: weekMonday.toISOString(), days });
  }

  return weeks;
}

export function ProgressClient({
  heatmapData,
  exercises,
  memberId,
  title = 'My Progress',
}: ProgressClientProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.exerciseId ?? '');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedExerciseId) return;
    async function loadHistory() {
      setLoading(true);
      try {
        const r = await fetch(`/api/progress/${memberId}?exerciseId=${selectedExerciseId}`);
        if (!r.ok) throw new Error('Failed to fetch');
        const data = (await r.json()) as { history: HistoryPoint[] };
        setHistory(data.history ?? []);
      } catch {
        toast.error('Failed to load exercise history');
      } finally {
        setLoading(false);
      }
    }
    void loadHistory();
  }, [selectedExerciseId, memberId]);

  const activeDates = new Set(heatmapData.map((d) => d.date));
  const weeks = buildHeatmapWeeks(activeDates);

  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    estimatedOneRM: h.estimatedOneRM,
  }));

  return (
    <div>
      <PageHeader title={title} />
      <div className="px-4 sm:px-8 py-7 space-y-7">
        {/* Training Frequency Heatmap */}
        <div>
          <SectionHeader title="Training Frequency" />
          <Card className="mt-3 bg-[#0c0c0c] border-[#141414] rounded-xl p-4">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {/* Day-of-week labels column */}
              <div className="flex flex-col gap-1 mr-1">
                <div className="h-3" />
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
                  <div key={`${label}-${i}`} className="h-3 w-3 flex items-center justify-center text-[9px] text-[#888]">
                    {label}
                  </div>
                ))}
              </div>
              {/* Week columns */}
              {weeks.map((week) => (
                <div key={week.weekKey} className="flex flex-col gap-1">
                  <div className="h-3 text-[9px] text-[#888] whitespace-nowrap">
                    {week.monthLabel ?? ''}
                  </div>
                  {week.days.map((day, di) => (
                    <div
                      key={`${week.weekKey}-${di}`}
                      className="w-3 h-3 rounded-[2px]"
                      style={{
                        backgroundColor: day.hasSession
                          ? '#2563eb'
                          : day.inRange
                            ? '#1a1a1a'
                            : 'transparent',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Strength Progress */}
        <div>
          <SectionHeader title="Strength Progress" />
          {exercises.length === 0 ? (
            <p className="mt-3 text-[12px] text-[#888]">No exercise history yet.</p>
          ) : (
            <>
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="mt-3 bg-[#0c0c0c] border border-[#141414] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#333]"
              >
                {exercises.map((ex) => (
                  <option key={ex.exerciseId} value={ex.exerciseId}>
                    {ex.exerciseName}
                  </option>
                ))}
              </select>

              <Card
                className={`mt-3 bg-[#0c0c0c] border-[#141414] rounded-xl p-4 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}
              >
                {chartData.length === 0 ? (
                  <p className="text-[12px] text-[#888] text-center py-8">
                    No history yet for this exercise.
                  </p>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#333' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#333' }} unit=" kg" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0c0c0c',
                            border: '1px solid #141414',
                            borderRadius: 8,
                          }}
                          labelStyle={{ color: '#666', fontSize: 10 }}
                          itemStyle={{ color: '#ccc', fontSize: 11 }}
                          formatter={(value) => [`${value ?? ''} kg`, 'Est. 1RM']}
                        />
                        <Line
                          type="monotone"
                          dataKey="estimatedOneRM"
                          stroke="#2563eb"
                          dot={{ fill: '#2563eb', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

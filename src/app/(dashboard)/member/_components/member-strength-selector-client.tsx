'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { variants } from '@/lib/animations/variants';

interface Props {
  exercises: { exerciseId: string; exerciseName: string }[];
  memberId: string;
}

interface HistoryPoint {
  date: string;
  estimatedOneRM: number;
}

export function MemberStrengthSelectorClient({ exercises, memberId }: Props) {
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

  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    estimatedOneRM: h.estimatedOneRM,
  }));

  if (exercises.length === 0) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65 mb-3">
          Strength Progress
        </div>
        <p className="text-sm text-foreground/65">No exercise history yet.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3"
      variants={variants.fadeSlideUp}
      initial="hidden"
      animate="visible"
    >
      <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65">
        Strength Progress
      </div>
      <select
        value={selectedExerciseId}
        onChange={(e) => setSelectedExerciseId(e.target.value)}
        aria-label="Select exercise"
        className="rounded-md bg-muted border border-border/60 px-3 py-1.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {exercises.map((ex) => (
          <option key={ex.exerciseId} value={ex.exerciseId}>
            {ex.exerciseName}
          </option>
        ))}
      </select>

      <div className={`transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
        {chartData.length === 0 ? (
          <p className="text-sm text-foreground/65 text-center py-8">
            No history yet for this exercise.
          </p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height={208}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-foreground/65"
                  stroke="currentColor"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-foreground/65"
                  stroke="currentColor"
                  unit=" kg"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: 'var(--muted-foreground)', fontSize: 10 }}
                  itemStyle={{ color: 'var(--foreground)', fontSize: 11 }}
                  formatter={(value) => [`${value ?? ''} kg`, 'Est. 1RM']}
                />
                <Line
                  type="monotone"
                  dataKey="estimatedOneRM"
                  stroke="rgb(16 185 129)"
                  strokeWidth={2}
                  dot={{ fill: 'rgb(16 185 129)', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
}

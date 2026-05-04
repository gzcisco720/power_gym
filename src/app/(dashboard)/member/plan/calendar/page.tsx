'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutCalendar } from '@/components/calendar/workout-calendar';
import { SessionDetailPanel } from '@/components/calendar/session-detail-panel';
import { PageHeader } from '@/components/shared/page-header';

interface SessionSet {
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
}

interface Session {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  rpe: number | null;
  memberNote: string | null;
  sets: SessionSet[];
}

export default function MemberCalendarPage() {
  const router = useRouter();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions?memberId=me&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: Session[]) => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, month]);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Training Calendar"
        actions={
          <button
            onClick={() => router.push('/member/plan')}
            className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
          >
            ← Back to Plan
          </button>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full space-y-4">
        <WorkoutCalendar
          sessions={sessions.filter((s) => s.completedAt !== null) as (Session & { completedAt: string })[]}
          onSelectSession={(s) => setSelected(s as Session)}
          selectedSessionId={selected?._id}
        />
        {loading && (
          <div className="text-[12px] text-[#555] text-center py-4">Loading…</div>
        )}
        {selected && <SessionDetailPanel session={selected} />}
      </div>
    </div>
  );
}

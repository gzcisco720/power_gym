import { useEffect, useState } from 'react';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useUsersStore } from '@/stores/usersStore';
import { toast } from 'sonner';

export function OwnerCalendarPage() {
  const { sessions, createSession, deleteSession, isLoading } = useScheduleStore();
  const { members, fetchOwnerMembers } = useUsersStore();
  const [showForm, setShowForm] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchOwnerMembers();
  }, [fetchOwnerMembers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createSession({ memberIds, date, startTime, endTime });
      toast.success('Session scheduled');
      setShowForm(false);
      setMemberIds([]);
      setDate('');
      setStartTime('');
      setEndTime('');
    } catch {
      toast.error('Failed to schedule session');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSession(id);
      toast.success('Session cancelled');
    } catch {
      toast.error('Failed to cancel session');
    }
  }

  if (isLoading && sessions.length === 0) return <div className="p-8 text-foreground/65">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
        >
          Schedule
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Schedule Session</h2>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
            <div>
              <label htmlFor="member-select" className="text-xs text-foreground/80">Member</label>
              <select
                id="member-select"
                required
                value={memberIds[0] ?? ''}
                onChange={(e) => setMemberIds([e.target.value])}
                className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              >
                <option value="" disabled>Select member</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date" className="text-xs text-foreground/80">Date</label>
              <input
                id="date"
                name="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              />
            </div>
            <div>
              <label htmlFor="startTime" className="text-xs text-foreground/80">Start time</label>
              <input
                id="startTime"
                name="startTime"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="text-xs text-foreground/80">End time</label>
              <input
                id="endTime"
                name="endTime"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-3 py-2 text-sm text-foreground/65"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s._id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div>
              <p className="text-sm font-medium text-foreground">{s.date}</p>
              <p className="text-xs text-foreground/65">{s.startTime} – {s.endTime}</p>
            </div>
            <button
              onClick={() => void handleDelete(s._id)}
              className="rounded px-2 py-1 text-xs text-destructive ring-1 ring-foreground/10 hover:ring-destructive/40"
            >
              Cancel
            </button>
          </div>
        ))}
        {sessions.length === 0 && !showForm && (
          <p className="text-sm text-foreground/65">No scheduled sessions.</p>
        )}
      </div>
    </div>
  );
}

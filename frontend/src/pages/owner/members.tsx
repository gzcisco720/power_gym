import { useEffect, useState } from 'react';
import { useUsersStore } from '@/stores/usersStore';

export function OwnerMembersPage() {
  const { members, trainers, fetchOwnerMembers, fetchTrainers, assignTrainer, isLoading } = useUsersStore();
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  useEffect(() => {
    void fetchOwnerMembers();
    void fetchTrainers();
  }, [fetchOwnerMembers, fetchTrainers]);

  async function handleAssign(memberId: string, trainerId: string) {
    await assignTrainer(memberId, trainerId);
    setReassigningId(null);
  }

  if (isLoading) return <div className="p-8 text-foreground/65">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Members</h1>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m._id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div>
              <p className="text-sm font-medium text-foreground">{m.name}</p>
              <p className="text-xs text-foreground/65">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground/65">
                {trainers.find((t) => t._id === m.trainerId)?.name ?? 'No trainer'}
              </span>
              {reassigningId === m._id ? (
                <select
                  className="rounded bg-background px-2 py-1 text-sm text-foreground ring-1 ring-foreground/10"
                  defaultValue=""
                  onChange={(e) => void handleAssign(m._id, e.target.value)}
                >
                  <option value="" disabled>Select trainer</option>
                  {trainers.map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setReassigningId(m._id)}
                  className="rounded px-2 py-1 text-xs text-foreground/65 ring-1 ring-foreground/10 hover:ring-foreground/25"
                >
                  Reassign
                </button>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-foreground/65">No members found.</p>
        )}
      </div>
    </div>
  );
}

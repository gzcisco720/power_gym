import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUsersStore } from '@/stores/usersStore';

export function OwnerTrainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { trainers, members, fetchTrainers, fetchOwnerMembers, isLoading } = useUsersStore();

  useEffect(() => {
    void fetchTrainers();
    void fetchOwnerMembers();
  }, [fetchTrainers, fetchOwnerMembers]);

  const trainer = trainers.find((t) => t._id === id);
  const trainerMembers = members.filter((m) => m.trainerId === id);

  if (isLoading) return <div className="p-8 text-foreground/65">Loading...</div>;

  if (!trainer) {
    return (
      <div className="p-8">
        <Link to="/owner/trainers" className="text-sm text-foreground/65 hover:text-foreground">← Back to trainers</Link>
        <p className="mt-4 text-sm text-foreground/65">Trainer not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link to="/owner/trainers" className="text-sm text-foreground/65 hover:text-foreground">← Back to trainers</Link>
      <h1 className="mt-4 mb-2 text-2xl font-bold text-foreground">{trainer.name}</h1>
      <p className="mb-6 text-sm text-foreground/65">{trainer.email}</p>

      <h2 className="mb-2 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Members ({trainerMembers.length})</h2>
      <div className="space-y-1.5">
        {trainerMembers.map((m) => (
          <div key={m._id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <p className="text-sm font-medium text-foreground">{m.name}</p>
            <p className="text-xs text-foreground/65">{m.email}</p>
          </div>
        ))}
        {trainerMembers.length === 0 && (
          <p className="text-sm text-foreground/65">No members assigned.</p>
        )}
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUsersStore } from '@/stores/usersStore';

export function OwnerTrainersPage() {
  const { trainers, members, fetchTrainers, fetchOwnerMembers, isLoading } = useUsersStore();

  useEffect(() => {
    void fetchTrainers();
    void fetchOwnerMembers();
  }, [fetchTrainers, fetchOwnerMembers]);

  if (isLoading) return <div className="p-8 text-foreground/65">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Trainers</h1>
      <div className="space-y-2">
        {trainers.map((t) => {
          const memberCount = members.filter((m) => m.trainerId === t._id).length;
          return (
            <Link
              key={t._id}
              to={`/owner/trainers/${t._id}`}
              className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-foreground/65">{t.email}</p>
              </div>
              <span className="text-xs text-foreground/65">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            </Link>
          );
        })}
        {trainers.length === 0 && (
          <p className="text-sm text-foreground/65">No trainers found.</p>
        )}
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUsersStore } from '@/stores/usersStore';

export function TrainerMembersPage() {
  const { members, fetchMembers, isLoading } = useUsersStore();

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

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
            <Link
              to={`/trainer/members/${m._id}`}
              className="rounded px-3 py-1 text-xs text-primary-light ring-1 ring-primary/25 hover:ring-primary/50"
            >
              View Hub →
            </Link>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-foreground/65">No members found.</p>
        )}
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUsersStore } from '@/stores/usersStore';

const TABS = [
  { label: 'Plan', path: 'plan' },
  { label: 'Nutrition', path: 'nutrition' },
  { label: 'Body Tests', path: 'body-tests' },
  { label: 'Health', path: 'health' },
  { label: 'Check-ins', path: 'check-ins' },
  { label: 'Photos', path: 'photos' },
  { label: 'Progress', path: 'progress' },
  { label: 'Billing', path: 'billing' },
  { label: 'Log', path: 'log/new' },
];

export function TrainerMemberHubPage() {
  const { id } = useParams<{ id: string }>();
  const { members, fetchOwnerMembers } = useUsersStore();

  useEffect(() => {
    if (members.length === 0) void fetchOwnerMembers();
  }, [members.length, fetchOwnerMembers]);

  const member = members.find((m) => m._id === id);

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">{member?.name ?? 'Member'}</h1>
      <p className="mb-6 text-sm text-foreground/65">{member?.email}</p>
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.path}
            to={`/trainer/members/${id}/${tab.path}`}
            className="rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground/65 ring-1 ring-foreground/10 hover:ring-foreground/25 hover:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

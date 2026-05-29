import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUsersStore } from '@/stores/usersStore';
import { PageHeader } from '@/components/shared/page-header';
import { MemberTabNav } from '@/components/shared/member-tab-nav';
import { Skeleton } from '@/components/ui/skeleton';

export function TrainerMemberHubPage() {
  const { id } = useParams<{ id: string }>();
  const { members, isLoading, fetchMembers } = useUsersStore();

  useEffect(() => {
    if (members.length === 0) void fetchMembers();
  }, [members.length, fetchMembers]);

  const member = members.find((m) => m._id === id);
  const basePath = `/trainer/members/${id ?? ''}`;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={member?.name ?? (isLoading ? '' : 'Member')}
        subtitle={member?.email}
      />
      {isLoading && !member ? (
        <div className="px-4 sm:px-8 py-4 space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      ) : null}
      <MemberTabNav basePath={basePath} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useUsersStore } from '@/stores/usersStore';
import { useBillingStore } from '@/stores/billingStore';

export function OwnerBillingPage() {
  const { members, fetchOwnerMembers } = useUsersStore();
  const { billingLines, fetchMemberBilling, isLoading } = useBillingStore();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    void fetchOwnerMembers();
  }, [fetchOwnerMembers]);

  async function handleSelectMember(memberId: string) {
    setSelectedMemberId(memberId);
    await fetchMemberBilling(memberId);
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Billing</h1>
      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <h2 className="mb-2 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Members</h2>
          <div className="space-y-1.5">
            {members.map((m) => (
              <button
                key={m._id}
                onClick={() => void handleSelectMember(m._id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ring-1 transition-colors ${
                  selectedMemberId === m._id
                    ? 'bg-primary/10 text-foreground ring-primary/40'
                    : 'bg-card text-foreground ring-foreground/10 hover:ring-foreground/25'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          {selectedMemberId && (
            <>
              <h2 className="mb-2 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Billing History</h2>
              {isLoading ? (
                <p className="text-sm text-foreground/65">Loading...</p>
              ) : billingLines.length === 0 ? (
                <p className="text-sm text-foreground/65">No billing records found.</p>
              ) : (
                <div className="space-y-1.5">
                  {billingLines.map((line) => (
                    <div key={line._id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
                      <p className="text-sm font-medium text-foreground">{line.serviceTypeName}</p>
                      <p className="text-xs text-foreground/65">${line.pricePerSession} · {line.sessionDate}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {!selectedMemberId && (
            <p className="text-sm text-foreground/65">Select a member to view billing.</p>
          )}
        </div>
      </div>
    </div>
  );
}

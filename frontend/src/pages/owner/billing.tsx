import { useEffect, useState } from 'react';
import { useUsersStore } from '@/stores/usersStore';
import { useBillingStore } from '@/stores/billingStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { Receipt } from 'lucide-react';

// NOTE: The v2 billingStore.fetchMemberBilling fetches transactions for a specific member.
// The v1 billing-summary-client uses a full-period summary endpoint (/api/billing?from=&to=)
// that is not exposed in the v2 API. We adapt by showing member-level billing lines after
// selection, using the existing fetchMemberBilling store action.

export function OwnerBillingPage() {
  const { members, fetchOwnerMembers } = useUsersStore();
  const { billingLines, fetchMemberBilling, isLoading } = useBillingStore();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    void fetchOwnerMembers();
  }, [fetchOwnerMembers]);

  function handleSelectMember(memberId: string) {
    setSelectedMemberId(memberId);
    void fetchMemberBilling(memberId);
  }

  const selectedMember = members.find((m) => m._id === selectedMemberId);
  const totalAmount = billingLines.reduce((sum, l) => sum + l.pricePerSession, 0);

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Completed sessions with a service type"
      />

      <div className="px-4 sm:px-8 py-6">
        <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
          {/* Member selector */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-2">
              Members
            </div>
            <div className="space-y-1.5">
              {members.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => handleSelectMember(m._id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm ring-1 transition-all ${
                    selectedMemberId === m._id
                      ? 'bg-primary/10 text-foreground ring-primary/40'
                      : 'bg-card text-foreground ring-foreground/10 hover:ring-foreground/25'
                  }`}
                >
                  {m.name}
                </button>
              ))}
              {members.length === 0 && (
                <p className="text-xs text-foreground/65">No members found.</p>
              )}
            </div>
          </div>

          {/* Billing lines */}
          <div>
            {!selectedMemberId ? (
              <EmptyState
                heading="Select a member"
                description="Choose a member on the left to view their billing history."
              />
            ) : isLoading ? (
              <StatCardsSkeleton count={3} className="grid-cols-1" />
            ) : billingLines.length === 0 ? (
              <EmptyState
                heading="No billing records"
                description={`No completed sessions with a service type found for ${selectedMember?.name ?? 'this member'}.`}
              />
            ) : (
              <div>
                <div className="grid grid-cols-[1fr_90px_80px] gap-3 px-3 pb-1.5 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
                  <span>Service</span>
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="space-y-1.5">
                  {billingLines.map((line) => (
                    <div
                      key={line._id}
                      className="grid grid-cols-[1fr_90px_80px] gap-3 items-center rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Receipt className="size-3.5 text-foreground/40 shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {line.serviceTypeName}
                        </span>
                      </div>
                      <span className="text-xs text-foreground/65">{line.sessionDate}</span>
                      <span className="text-sm font-semibold text-primary-light text-right">
                        ${line.pricePerSession}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t border-foreground/[.06]">
                  <span className="text-sm text-foreground/65 mr-3">Total</span>
                  <span className="text-base font-bold text-primary-light">
                    ${totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

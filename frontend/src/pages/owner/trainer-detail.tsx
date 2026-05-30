import { useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrainersStore } from '@/stores/trainersStore';
import { initials } from '@/lib/utils';
import type { TrainerMemberItem, TrainerPlanItem, TrainerNutritionPlanItem } from '@/api/trainers';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Sub-tab contents ─────────────────────────────────────────────────────────

function OverviewTab() {
  const trainerDetail = useTrainersStore((s) => s.trainerDetail);
  const trainerMembers = useTrainersStore((s) => s.trainerMembers);
  const trainerPlans = useTrainersStore((s) => s.trainerPlans);
  const trainerNutritionPlans = useTrainersStore((s) => s.trainerNutritionPlans);
  const isLoading = useTrainersStore((s) => s.isLoading);

  if (isLoading || !trainerDetail) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4 bg-primary/10 ring-1 ring-primary/20">
          <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Members</div>
          <div className="mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums">{trainerDetail.memberCount}</div>
        </div>
        <div className="rounded-xl p-4 bg-white/[.03] ring-1 ring-white/[.07]">
          <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Sessions / Mo</div>
          <div className="mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums">{trainerDetail.sessionsThisMonth}</div>
        </div>
        <div className="rounded-xl p-4 bg-white/[.03] ring-1 ring-white/[.07]">
          <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Templates</div>
          <div className="mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums">{trainerDetail.templateCount}</div>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Training Plans</div>
          <div className="mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums">{trainerPlans.length}</div>
        </div>
        <div className="rounded-xl p-4 bg-white/[.03] ring-1 ring-white/[.07]">
          <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Nutrition Plans</div>
          <div className="mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums">{trainerNutritionPlans.length}</div>
        </div>
        <div className="rounded-xl p-4 bg-white/[.03] ring-1 ring-white/[.07]">
          <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Active Members</div>
          <div className="mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums">
            {trainerMembers.filter((m) => m.status === 'active').length}
          </div>
        </div>
      </div>
    </div>
  );
}

function MembersTab({ members, isLoading }: { members: TrainerMemberItem[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-xl" />
        ))}
      </div>
    );
  }

  const statusLabel: Record<TrainerMemberItem['status'], string> = {
    active: 'Active',
    'needs-attn': 'Needs Attention',
    'no-plan': 'No Plan',
  };
  const statusColor: Record<TrainerMemberItem['status'], string> = {
    active: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/20',
    'needs-attn': 'text-amber-300 bg-amber-500/10 ring-amber-500/20',
    'no-plan': 'text-foreground/40 bg-white/[.04] ring-white/[.08]',
  };

  if (members.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-8 text-center">
        <p className="text-[13px] text-foreground/65">This trainer has no assigned members yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/65 font-semibold mb-3">
        All Members ({members.length})
      </div>
      <div className="space-y-1.5">
        {members.map((member) => (
          <div
            key={member._id}
            className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-light">
              {initials(member.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground/85 truncate">{member.name}</div>
              <div className="text-[11px] text-foreground/35 mt-0.5 truncate">{member.email}</div>
            </div>
            <div className="hidden sm:flex items-center gap-4 shrink-0">
              <div className="text-center">
                <div className="text-base font-bold text-foreground/85 leading-none">{member.streak}</div>
                <div className="text-[9px] uppercase tracking-[1.5px] text-foreground/30 mt-0.5">streak</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-foreground/85 leading-none">{member.sessionsThisMonth}</div>
                <div className="text-[9px] uppercase tracking-[1.5px] text-foreground/30 mt-0.5">sessions</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 shrink-0 ${statusColor[member.status]}`}
            >
              {statusLabel[member.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrainingPlansTab({
  plans,
  isLoading,
}: {
  plans: TrainerPlanItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[56px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/65 font-semibold mb-3">
        {plans.length} Training Template{plans.length !== 1 ? 's' : ''}
      </div>
      {plans.length === 0 ? (
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-8 text-center">
          <p className="text-[13px] text-foreground/65">This trainer hasn&apos;t created any training plans yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-base">
                🏋
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground/85 truncate">{plan.name}</div>
                <div className="text-[11px] text-foreground/35 mt-0.5">
                  {plan.daysCount} day{plan.daysCount !== 1 ? 's' : ''} · Created {formatDate(plan.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NutritionPlansTab({
  plans,
  isLoading,
}: {
  plans: TrainerNutritionPlanItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[56px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/65 font-semibold mb-3">
        {plans.length} Nutrition Template{plans.length !== 1 ? 's' : ''}
      </div>
      {plans.length === 0 ? (
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-8 text-center">
          <p className="text-[13px] text-foreground/65">This trainer hasn&apos;t created any nutrition plans yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-base">
                🥗
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground/85 truncate">{plan.name}</div>
                <div className="text-[11px] text-foreground/35 mt-0.5">
                  {plan.dayTypesCount} day type{plan.dayTypesCount !== 1 ? 's' : ''} · Created {formatDate(plan.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarTab() {
  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-8 text-center">
      <p className="text-[13px] text-foreground/65">Calendar view coming soon.</p>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', path: '' },
  { id: 'members', label: 'Members', path: 'members' },
  { id: 'training-plans', label: 'Training Plans', path: 'training-plans' },
  { id: 'nutrition-plans', label: 'Nutrition Plans', path: 'nutrition-plans' },
  { id: 'calendar', label: 'Calendar', path: 'calendar' },
] as const;

// ─── Main page component ──────────────────────────────────────────────────────

export function OwnerTrainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const trainerDetail = useTrainersStore((s) => s.trainerDetail);
  const trainerMembers = useTrainersStore((s) => s.trainerMembers);
  const trainerPlans = useTrainersStore((s) => s.trainerPlans);
  const trainerNutritionPlans = useTrainersStore((s) => s.trainerNutritionPlans);
  const isLoading = useTrainersStore((s) => s.isLoading);
  const fetchTrainerDetail = useTrainersStore((s) => s.fetchTrainerDetail);

  useEffect(() => {
    if (id) void fetchTrainerDetail(id);
  }, [id, fetchTrainerDetail]);

  // Determine active tab from URL
  const segments = location.pathname.split('/');
  const lastSegment = segments[segments.length - 1] ?? '';
  const activeTab = TABS.find((t) => t.path === lastSegment)?.id ?? 'overview';

  function handleTabClick(tab: (typeof TABS)[number]) {
    if (!id) return;
    const base = `/owner/trainers/${id}`;
    navigate(tab.path ? `${base}/${tab.path}` : base);
  }

  const trainerInitials = trainerDetail
    ? trainerDetail.name
        .split(' ')
        .map((n) => n[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '…';

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-foreground/[.06] bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            {isLoading && !trainerDetail ? (
              <Skeleton className="size-10 rounded-full" />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-[0_0_14px_rgba(99,102,241,0.35)] text-[13px] font-bold text-white">
                {trainerInitials}
              </div>
            )}
            <div>
              {isLoading && !trainerDetail ? (
                <Skeleton className="h-5 w-32 rounded" />
              ) : (
                <>
                  <div className="text-[16px] font-bold text-foreground leading-tight">
                    {trainerDetail?.name ?? ''}
                  </div>
                  <div className="text-[11px] text-foreground/65 mt-0.5">
                    {trainerDetail?.email ?? ''}
                    {trainerDetail && (
                      <>
                        <span className="mx-1.5 text-foreground/20">·</span>
                        Joined {daysSince(trainerDetail.createdAt)} days ago
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <Link
            to="/owner/trainers"
            className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors"
          >
            ← All Trainers
          </Link>
        </div>

        {/* Tab nav */}
        <div className="flex gap-0 overflow-x-auto px-4 sm:px-8" role="tablist" aria-label="Trainer hub navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabClick(tab)}
              className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-foreground/40 hover:text-foreground/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 sm:px-8 py-7">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'members' && (
          <MembersTab members={trainerMembers} isLoading={isLoading} />
        )}
        {activeTab === 'training-plans' && (
          <TrainingPlansTab plans={trainerPlans} isLoading={isLoading} />
        )}
        {activeTab === 'nutrition-plans' && (
          <NutritionPlansTab plans={trainerNutritionPlans} isLoading={isLoading} />
        )}
        {activeTab === 'calendar' && <CalendarTab />}
      </div>
    </div>
  );
}

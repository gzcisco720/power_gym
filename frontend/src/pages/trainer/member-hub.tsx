import { useEffect } from 'react';
import { Link, Outlet, useParams, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberHubTabNav } from '@/components/member-hub/member-hub-tab-nav';
import { StatStripSection } from '@/components/member-hub/stat-strip-section';
import { PlanCardSection } from '@/components/member-hub/plan-card-section';
import { HealthPanelSection } from '@/components/member-hub/health-panel-section';
import { PlanTab } from '@/components/member-hub/plan-tab';
import { NutritionTab } from '@/components/member-hub/nutrition-tab';
import { useMemberHubStore } from '@/stores/memberHubStore';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const memberId = useMemberHubStore((s) => s.memberId);
  const statStrip = useMemberHubStore((s) => s.statStrip);
  const planCard = useMemberHubStore((s) => s.planCard);
  const healthSummary = useMemberHubStore((s) => s.healthSummary);
  const isLoading = useMemberHubStore((s) => s.isLoadingOverview);

  if (!memberId) return null;
  const basePath = `/trainer/members/${memberId}`;

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        <div className="flex flex-col gap-3">
          {isLoading || !statStrip ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[80px] rounded-xl" />
              ))}
            </div>
          ) : (
            <StatStripSection statStrip={statStrip} />
          )}
          {isLoading ? (
            <Skeleton className="h-[88px] rounded-xl" />
          ) : (
            <PlanCardSection planCard={planCard ?? null} planHref={`${basePath}/plan`} />
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-[200px] rounded-xl" />
        ) : healthSummary ? (
          <HealthPanelSection healthSummary={healthSummary} healthHref={`${basePath}/health`} />
        ) : null}
      </div>
    </div>
  );
}

// ─── Plan Tab wrapper ─────────────────────────────────────────────────────────

function PlanTabWrapper() {
  const { id: memberId } = useParams<{ id: string }>();
  const plan = useMemberHubStore((s) => s.plan);
  const isLoading = useMemberHubStore((s) => s.isLoadingPlan);
  const fetchPlan = useMemberHubStore((s) => s.fetchPlan);
  const fetchOverview = useMemberHubStore((s) => s.fetchOverview);

  useEffect(() => {
    if (memberId) void fetchPlan(memberId);
  }, [memberId, fetchPlan]);

  if (!memberId) return null;

  if (isLoading || !plan) {
    return (
      <div className="px-4 sm:px-8 py-7 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[80px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <PlanTab
      memberId={memberId}
      data={plan}
      onPlanAssigned={() => {
        void fetchOverview(memberId);
        void fetchPlan(memberId);
      }}
    />
  );
}

// ─── Nutrition Tab wrapper ────────────────────────────────────────────────────

function NutritionTabWrapper() {
  const { id: memberId } = useParams<{ id: string }>();
  const nutrition = useMemberHubStore((s) => s.nutrition);
  const isLoading = useMemberHubStore((s) => s.isLoadingNutrition);
  const fetchNutrition = useMemberHubStore((s) => s.fetchNutrition);

  useEffect(() => {
    if (memberId) void fetchNutrition(memberId);
  }, [memberId, fetchNutrition]);

  if (!memberId) return null;

  if (isLoading || !nutrition) {
    return (
      <div className="px-4 sm:px-8 py-7 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[80px] rounded-xl" />
        ))}
      </div>
    );
  }

  const basePath = `/trainer/members/${memberId}`;

  return (
    <NutritionTab
      memberId={memberId}
      basePath={basePath}
      data={nutrition}
      onRefresh={() => void fetchNutrition(memberId)}
    />
  );
}

// ─── Placeholder for not-yet-built tabs ──────────────────────────────────────

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 text-center">
        <p className="text-sm text-foreground/40">{label} (coming soon)</p>
      </div>
    </div>
  );
}

// ─── Hub Layout ───────────────────────────────────────────────────────────────

export function TrainerMemberHubPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const location = useLocation();
  const profile = useMemberHubStore((s) => s.profile);
  const planCard = useMemberHubStore((s) => s.planCard);
  const isLoading = useMemberHubStore((s) => s.isLoadingOverview);
  const fetchOverview = useMemberHubStore((s) => s.fetchOverview);

  useEffect(() => {
    if (memberId) void fetchOverview(memberId);
  }, [memberId, fetchOverview]);

  if (!memberId) return null;

  const basePath = `/trainer/members/${memberId}`;
  const backHref = '/trainer/members';

  const memberInitials = profile ? initials(profile.name) : '';
  const hasPlan = !!planCard;

  // Determine which tab content to render based on the current path
  const pathname = location.pathname;
  const isOverview = pathname === basePath || pathname === `${basePath}/`;
  const isPlan = pathname.startsWith(`${basePath}/plan`);
  const isNutrition = pathname.startsWith(`${basePath}/nutrition`);
  const isBodyTests = pathname.startsWith(`${basePath}/body-tests`);
  const isHealth = pathname.startsWith(`${basePath}/health`);
  const isCheckIns = pathname.startsWith(`${basePath}/check-ins`);
  const isPhotos = pathname.startsWith(`${basePath}/photos`);

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background">
        {/* Breadcrumb */}
        <div className="px-4 pt-3 sm:px-8">
          <Link
            to={backHref}
            className="text-[11px] text-foreground/30 hover:text-foreground/55 transition-colors flex items-center gap-1 w-fit"
          >
            ← Members
          </Link>
        </div>

        {/* Identity + CTA */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-4">
            {isLoading || !profile ? (
              <Skeleton className="size-12 rounded-full" />
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 ring-4 ring-primary/[.06] text-[15px] font-bold text-primary-light">
                {memberInitials}
              </div>
            )}
            <div>
              {isLoading || !profile ? (
                <>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </>
              ) : (
                <>
                  <div className="text-[16px] font-bold text-foreground leading-tight">{profile.name}</div>
                  <div className="text-[11px] text-foreground/65 mt-0.5">
                    {profile.email}
                    <span className="mx-1.5 text-foreground/20" aria-hidden="true">·</span>
                    Joined {formatJoinDate(profile.createdAt)}
                  </div>
                </>
              )}
            </div>
          </div>

          {hasPlan && (
            <Link
              to={`${basePath}/plan`}
              className="bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors"
            >
              Log Workout
            </Link>
          )}
        </div>

        <MemberHubTabNav basePath={basePath} />
      </div>

      <main>
        {isOverview && <OverviewTab />}
        {isPlan && <PlanTabWrapper />}
        {isNutrition && <NutritionTabWrapper />}
        {isBodyTests && <TabPlaceholder label="Body Tests" />}
        {isHealth && <TabPlaceholder label="Health" />}
        {isCheckIns && <TabPlaceholder label="Check-ins" />}
        {isPhotos && <TabPlaceholder label="Photos" />}
        {/* Outlet for any sub-routes not covered above */}
        {!isOverview && !isPlan && !isNutrition && !isBodyTests && !isHealth && !isCheckIns && !isPhotos && <Outlet />}
      </main>
    </div>
  );
}

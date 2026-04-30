# React Suspense Streaming — Design Spec

## Goal

Add Suspense streaming to all pages that use `Promise.all` for parallel data fetches, so the page layout renders immediately and content sections stream in progressively as their data resolves.

## Scope

### Target Pages

| Page | Path | Strategy | Sections |
|---|---|---|---|
| Member Hub Overview | `trainer/members/[id]/page.tsx` | Fine-grained | Stat cards + Health |
| Owner Dashboard | `owner/page.tsx` | Fine-grained | Stats + Trainer Breakdown |
| Member Progress | `member/progress/page.tsx` | Coarse | Whole content |
| Trainer Member Progress | `trainer/members/[id]/progress/page.tsx` | Coarse | Whole content |
| Owner Trainer Hub | `owner/trainers/[id]/page.tsx` | Coarse | Whole content |

**Fine-grained**: multiple independent `<Suspense>` boundaries per page — each section streams as its own data resolves.

**Coarse**: single `<Suspense>` boundary — page shell renders immediately, content area shows skeleton until all data loads.

---

## Architecture

### Pattern

Each page is refactored in three steps:

1. **Thin the page component** — remove all `connectDB`, repository calls, and data transform logic. The page component only renders layout and `<Suspense>` boundaries.
2. **Extract async section components** — one `async function` per Suspense boundary, in `_components/`. Each does its own `connectDB()` + repository calls (idempotent — `connectDB` is a no-op if already connected).
3. **Add skeleton fallbacks** — each `<Suspense>` gets a structured skeleton that mirrors the real layout.

### Auth & ownership checks

- `auth()` stays in the page component (fast, cached by Next.js per request).
- For pages with ownership checks (trainer member progress), the check runs in the page before rendering the Suspense boundary — `null` is returned early if unauthorized.
- `connectDB()` is called inside each async section component (safe to call multiple times).

---

## File Changes

### New files

```
src/app/(dashboard)/trainer/members/[id]/_components/
  stat-cards-section.tsx          async Server Component: body test + stats + plan
  stat-cards-skeleton.tsx         5-card skeleton grid

  health-section.tsx              async Server Component: active injuries
  health-section-skeleton.tsx     title + card block skeleton

src/app/(dashboard)/owner/_components/
  dashboard-stats.tsx             async Server Component: trainers + members + invites + sessions
  dashboard-stats-skeleton.tsx    4-card skeleton grid (wraps StatCardsSkeleton)
  trainer-breakdown-section.tsx   async Server Component: per-trainer session counts
  trainer-breakdown-skeleton.tsx  title + 3 row skeletons

src/app/(dashboard)/member/progress/_components/
  progress-content.tsx            async Server Component: completed dates + exercises
  progress-skeleton.tsx           heatmap block + list block

src/app/(dashboard)/owner/trainers/[id]/_components/
  trainer-stats-section.tsx       async Server Component: members + sessions + templates
  trainer-stats-skeleton.tsx      3-card skeleton grid (wraps StatCardsSkeleton)

src/components/shared/
  stat-cards-skeleton.tsx         shared: accepts count prop, renders N skeleton cards
```

### Modified files

```
src/app/(dashboard)/trainer/members/[id]/page.tsx       thinned
src/app/(dashboard)/owner/page.tsx                      thinned
src/app/(dashboard)/member/progress/page.tsx            thinned
src/app/(dashboard)/trainer/members/[id]/progress/page.tsx  thinned
src/app/(dashboard)/owner/trainers/[id]/page.tsx        thinned
```

---

## Skeleton Components

All skeletons use the Shadcn `<Skeleton />` primitive and mirror the real layout's dimensions and spacing.

### `StatCardsSkeleton` (shared)

```tsx
// src/components/shared/stat-cards-skeleton.tsx
interface Props { count: number }
export function StatCardsSkeleton({ count }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-xl" />
      ))}
    </div>
  );
}
```

Used by: Member Hub (count=5), Owner Dashboard (count=4), Trainer Hub (count=3).

### `HealthSectionSkeleton`

```tsx
<div className="space-y-3">
  <Skeleton className="h-3 w-16" />        {/* "Health" label */}
  <Skeleton className="h-[80px] rounded-xl" />
</div>
```

### `TrainerBreakdownSkeleton`

```tsx
<div className="space-y-3">
  <Skeleton className="h-3 w-32" />
  {[0, 1, 2].map((i) => (
    <Skeleton key={i} className="h-10 rounded-lg" />
  ))}
</div>
```

### `ProgressSkeleton`

```tsx
<div className="space-y-6">
  <Skeleton className="h-[120px] rounded-xl" />   {/* heatmap */}
  <Skeleton className="h-[200px] rounded-xl" />   {/* exercise list */}
</div>
```

---

## Per-Page Design

### Member Hub Overview

```tsx
// page.tsx (after)
export default async function MemberHubOverviewPage({ params }) {
  const session = await auth();
  if (!session?.user) return null;
  const { id: memberId } = await params;
  return (
    <div className="px-4 sm:px-8 py-7 space-y-6">
      <Suspense fallback={<StatCardsSkeleton count={5} />}>
        <StatCardsSection memberId={memberId} />
      </Suspense>
      <Suspense fallback={<HealthSectionSkeleton />}>
        <HealthSection memberId={memberId} />
      </Suspense>
    </div>
  );
}
```

`StatCardsSection` fetches: body test + workout stats + active plan.
`HealthSection` fetches: active injuries (renders existing `InjuryClient` is NOT used here — this is server-rendered read-only view; the full `InjuryClient` lives in the `/health` tab).

### Owner Dashboard

```tsx
// page.tsx (after)
export default async function OwnerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Gym overview" actions={<InviteLink />} />
      <div className="px-4 sm:px-8 py-7 space-y-8">
        <Suspense fallback={<StatCardsSkeleton count={4} />}>
          <DashboardStats />
        </Suspense>
        <Suspense fallback={<TrainerBreakdownSkeleton />}>
          <TrainerBreakdownSection />
        </Suspense>
      </div>
    </div>
  );
}
```

`InviteLink` extracted as a small client-compatible component so `PageHeader` renders immediately without data.

`DashboardStats` fetches: trainers, members, invites, sessionsThisMonth.
`TrainerBreakdownSection` fetches: per-trainer session counts (the slow N-query path).

### Member Progress

```tsx
export default async function MemberProgressPage() {
  const session = await auth();
  if (!session?.user) return null;
  return (
    <Suspense fallback={<ProgressSkeleton />}>
      <ProgressContent memberId={session.user.id} />
    </Suspense>
  );
}
```

### Trainer Member Progress

```tsx
export default async function TrainerMemberProgressPage({ params }) {
  const session = await auth();
  if (!session?.user) return null;
  const { id: memberId } = await params;
  await connectDB();
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) return null;
  if (session.user.role === 'trainer' && member.trainerId?.toString() !== session.user.id) return null;
  return (
    <Suspense fallback={<ProgressSkeleton />}>
      <ProgressContent
        memberId={memberId}
        title={`${member.name}'s Progress`}
        role={session.user.role as UserRole}
      />
    </Suspense>
  );
}
```

Ownership check stays in page (requires `member` data). `ProgressContent` shares the same component as the member version, extended with optional `title` and `role` props.

### Owner Trainer Hub

```tsx
export default async function TrainerHubOverviewPage({ params }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');
  const { id: trainerId } = await params;
  return (
    <div className="px-4 sm:px-8 py-7">
      <Suspense fallback={<StatCardsSkeleton count={3} />}>
        <TrainerStatsSection trainerId={trainerId} />
      </Suspense>
    </div>
  );
}
```

---

## Testing

- **Unit tests**: existing Jest tests mock repositories at the page level. After refactoring, tests targeting thinned page components remain valid (they mock the same repositories used by the section components). No new unit tests required — section components have no logic beyond fetch + render.
- **E2E tests**: all 85 existing Playwright specs continue to cover the rendered output. Skeletons are not tested (pure UI with no behavior).
- **Manual verification**: run `pnpm dev`, load each affected page on a throttled network (Chrome DevTools → Slow 3G) to confirm progressive rendering.

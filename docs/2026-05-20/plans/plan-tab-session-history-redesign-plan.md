# Plan Tab — Session History Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Session History list with month grouping, workout-type color indicators, and client-side "load more" pagination — replacing the unbounded flat list.

**Architecture:** Two-layer change: (1) server — `findByMember` gains an optional `limit` param capped at 50 to prevent full-table dumps; (2) client — `TrainerMemberPlanClient` gains `groupByMonth` and `dayAccentBg` pure helpers, a `visibleCount` state (initial 8), and a new grouped render that replaces the flat `<ul>`. No new files needed.

**Tech Stack:** React `useState`, Tailwind CSS static class strings (no dynamic class generation), `@testing-library/react` for existing test file

---

## File Map

| Action | File |
|---|---|
| Modify | `src/lib/repositories/workout-session.repository.ts` |
| Modify | `src/app/(dashboard)/trainer/members/[id]/plan/page.tsx` |
| Modify | `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx` |
| Modify | `__tests__/app/trainer/members/trainer-member-plan-client.test.tsx` |

---

## Task 1: Add optional `limit` to `findByMember` and apply it in page.tsx

**Files:**
- Modify: `src/lib/repositories/workout-session.repository.ts`
- Modify: `src/app/(dashboard)/trainer/members/[id]/plan/page.tsx`

No TDD needed here — this is a narrow interface change with no observable behavior difference when limit > total count.

- [ ] **Step 1: Update `IWorkoutSessionRepository` interface**

In `src/lib/repositories/workout-session.repository.ts`, change line 31:
```ts
findByMember(memberId: string, limit?: number): Promise<IWorkoutSession[]>;
```

- [ ] **Step 2: Update `MongoWorkoutSessionRepository.findByMember` implementation**

Replace the existing `findByMember` method body (currently lines 80–86) with:
```ts
async findByMember(memberId: string, limit?: number): Promise<IWorkoutSession[]> {
  const query = WorkoutSessionModel.find({
    memberId: new mongoose.Types.ObjectId(memberId),
  }).sort({ startedAt: -1 });
  return limit ? query.limit(limit) : query;
}
```

- [ ] **Step 3: Pass `limit: 50` in page.tsx**

In `src/app/(dashboard)/trainer/members/[id]/plan/page.tsx`, change:
```ts
sessionRepo.findByMember(memberId),
```
to:
```ts
sessionRepo.findByMember(memberId, 50),
```

- [ ] **Step 4: Run lint**

```bash
pnpm lint
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add \
  src/lib/repositories/workout-session.repository.ts \
  "src/app/(dashboard)/trainer/members/[id]/plan/page.tsx"
git commit -m "feat(plan): cap session history load at 50 via optional limit param"
```

---

## Task 2: Write failing tests for the new Session History behavior

**Files:**
- Modify: `__tests__/app/trainer/members/trainer-member-plan-client.test.tsx`

Add a new `describe('Session History')` block. The tests will fail until Task 3 implements the grouped view.

- [ ] **Step 1: Add mock session factory and the new describe block**

Append to `__tests__/app/trainer/members/trainer-member-plan-client.test.tsx`:

```ts
// ─── Session History ──────────────────────────────────────────────────────────

function makeSession(
  id: string,
  dayName: string,
  startedAt: string,
): import('@/lib/training/session-summary').SessionSummary {
  return { _id: id, dayName, startedAt, completedAt: startedAt, exerciseCount: 2, setCount: 6, totalVolume: 2400 };
}

// 5 May + 4 Apr + 3 Mar = 12 sessions (sorted newest-first)
const SESSIONS_12 = [
  makeSession('s1',  'Push', '2026-05-13T10:00:00Z'),
  makeSession('s2',  'Pull', '2026-05-10T10:00:00Z'),
  makeSession('s3',  'Legs', '2026-05-06T10:00:00Z'),
  makeSession('s4',  'Push', '2026-05-03T10:00:00Z'),
  makeSession('s5',  'Pull', '2026-05-01T10:00:00Z'),
  makeSession('s6',  'Legs', '2026-04-29T10:00:00Z'),
  makeSession('s7',  'Push', '2026-04-26T10:00:00Z'),
  makeSession('s8',  'Pull', '2026-04-22T10:00:00Z'),
  makeSession('s9',  'Legs', '2026-04-19T10:00:00Z'),
  makeSession('s10', 'Push', '2026-03-15T10:00:00Z'),
  makeSession('s11', 'Pull', '2026-03-08T10:00:00Z'),
  makeSession('s12', 'Legs', '2026-03-01T10:00:00Z'),
];

describe('Session History', () => {
  const baseProps = {
    memberId: 'm1',
    templates: [],
    activePlan: null,
    pbs: [],
  };

  it('shows only 8 sessions initially when there are 12', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12} />);
    // s1–s8 visible, s9–s12 not
    expect(screen.getByText('Push')).toBeInTheDocument(); // s1
    expect(screen.queryByText('Mar 15, 2026')).not.toBeInTheDocument(); // s10 hidden
  });

  it('shows "Show 4 more sessions" button when 12 sessions and 8 visible', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12} />);
    expect(screen.getByRole('button', { name: /show 4 more/i })).toBeInTheDocument();
  });

  it('reveals all sessions after clicking "Show more"', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12} />);
    fireEvent.click(screen.getByRole('button', { name: /show 4 more/i }));
    expect(screen.getByText('Mar 15, 2026')).toBeInTheDocument(); // s10 now visible
  });

  it('does not show "Show more" button when sessions <= 8', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12.slice(0, 6)} />);
    expect(screen.queryByRole('button', { name: /show .* more/i })).not.toBeInTheDocument();
  });

  it('renders month group header "May 2026" for May sessions', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12} />);
    expect(screen.getByText(/may 2026/i)).toBeInTheDocument();
  });

  it('renders month group header "Apr 2026" for April sessions', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12} />);
    expect(screen.getByText(/apr 2026/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — confirm the new describe block fails**

```bash
pnpm test __tests__/app/trainer/members/trainer-member-plan-client.test.tsx
```

Expected: 3 existing tests pass, 6 new `Session History` tests fail (the component doesn't group by month or limit to 8 yet).

---

## Task 3: Implement grouped Session History in the client component

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx`

Replace the flat session list with a grouped, color-coded, paginated view.

- [ ] **Step 1: Add helper functions after the existing `formatVolume` function**

In `trainer-member-plan-client.tsx`, add after `formatVolume`:

```ts
// Returns a static Tailwind bg class for the colored left bar.
// All strings must be full class names so Tailwind's scanner detects them.
function dayAccentBg(dayName: string): string {
  const n = dayName.toLowerCase();
  if (n.includes('push'))  return 'bg-primary/50';
  if (n.includes('pull'))  return 'bg-emerald-500/50';
  if (n.includes('legs') || n.includes('leg')) return 'bg-amber-500/50';
  if (n.includes('upper')) return 'bg-purple-500/50';
  if (n.includes('lower')) return 'bg-orange-500/50';
  // Deterministic fallback from name hash
  const palette = ['bg-sky-500/50', 'bg-pink-500/50', 'bg-violet-500/50'];
  let h = 0;
  for (let i = 0; i < dayName.length; i++) h += dayName.charCodeAt(i);
  return palette[h % palette.length];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function groupByMonth(
  sessions: SessionSummary[],
): { label: string; sessions: SessionSummary[] }[] {
  const map = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([label, sessions]) => ({ label, sessions }));
}
```

- [ ] **Step 2: Add `visibleCount` state inside `TrainerMemberPlanClient`**

Inside the component function body, after the existing `useState` declarations, add:

```ts
const [visibleCount, setVisibleCount] = useState(8);
```

- [ ] **Step 3: Replace the flat session `<ul>` with the grouped render**

Find the entire `{sessions.length > 0 && ( <section>...</section> )}` block (everything from `{sessions.length > 0` to the matching closing `}`) and replace it with:

```tsx
{sessions.length > 0 && (
  <section className="px-4 sm:px-8">
    <SectionHeader title="Session History" />

    <div className="mt-3 space-y-5">
      {groupByMonth(sessions.slice(0, visibleCount)).map(({ label, sessions: group }) => (
        <div key={label}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
              {label}
            </span>
            <span className="text-[11px] text-foreground/25">
              {group.length} {group.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>
          <ul className="space-y-1.5">
            {group.map((s) => {
              const isActive = s.completedAt === null;
              const date = formatDate(s.startedAt);
              return (
                <li key={s._id}>
                  <button
                    type="button"
                    onClick={() => setPeekSession(s)}
                    className="w-full rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/25 transition-colors flex items-stretch text-left cursor-pointer overflow-hidden"
                  >
                    <div className={`w-1 shrink-0 ${dayAccentBg(s.dayName)}`} />
                    <div className="flex items-center flex-1 px-3 py-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{s.dayName}</span>
                        <span className="text-xs text-foreground/40">·</span>
                        <span className="text-xs text-foreground/65">{date}</span>
                        {isActive && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-amber-500/30 shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-3 shrink-0 text-xs text-foreground/65 tabular-nums">
                        <span>{s.exerciseCount} ex</span>
                        <span className="text-foreground/40">·</span>
                        <span>{s.setCount} sets</span>
                        {s.totalVolume > 0 && (
                          <>
                            <span className="text-foreground/40">·</span>
                            <span>{formatVolume(s.totalVolume)}</span>
                          </>
                        )}
                        <ChevronRight className="size-3.5 text-foreground/30 ml-1" />
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>

    {sessions.length > visibleCount && (
      <button
        type="button"
        onClick={() => setVisibleCount((c) => c + 8)}
        className="mt-4 w-full rounded-xl border border-foreground/10 py-2.5 text-sm text-foreground/50 hover:text-foreground/75 hover:border-foreground/20 transition-colors"
      >
        Show {Math.min(8, sessions.length - visibleCount)} more sessions
      </button>
    )}

    <SessionPeekSheet
      memberId={memberId}
      session={peekSession}
      open={peekSession !== null}
      onOpenChange={(open) => {
        if (!open) setPeekSession(null);
      }}
    />
  </section>
)}
```

- [ ] **Step 4: Run all tests — all 9 should pass**

```bash
pnpm test __tests__/app/trainer/members/trainer-member-plan-client.test.tsx
```

Expected:
```
Tests: 9 passed, 9 total
```

- [ ] **Step 5: Run lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Visual check in browser**

Navigate to `http://localhost:3000/trainer/members/6a096af17825c9a7cf7a5165/plan`.

Verify:
1. Session History shows "May 2026 · 5 sessions" header, then 5 rows (s1–s5)
2. "Apr 2026 · 3 sessions" header shows next, with only 3 of 4 April rows (limited to 8 total)
3. "Show 4 more sessions" button visible at bottom
4. Each row has a colored left bar: Push=indigo, Pull=emerald, Legs=amber
5. Clicking "Show 4 more sessions" reveals Apr row 4 + all 3 March rows
6. March header "Mar 2026 · 3 sessions" appears after loading more
7. No "Show more" button once all sessions visible

- [ ] **Step 7: Commit**

```bash
git add \
  "src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx" \
  "__tests__/app/trainer/members/trainer-member-plan-client.test.tsx"
git commit -m "feat(plan): group session history by month with color indicators and load-more pagination"
```

---

## Self-Review

**Spec coverage:**
- ✅ Month grouping (`groupByMonth`) — Task 3 Step 1 + 3
- ✅ Workout-type color left bar (`dayAccentBg`) — Task 3 Step 1 + 3
- ✅ Initial 8 sessions, "Show N more" — Task 3 Step 2 + 3
- ✅ `findByMember` capped at 50 — Task 1

**Placeholder scan:** None.

**Type consistency:** `SessionSummary` imported from `@/lib/training/session-summary` in both the component and test file. `groupByMonth` takes `SessionSummary[]` and uses only `.startedAt` (string ISO). `dayAccentBg` takes `string`. `MONTHS` array defined once at module level, referenced in `groupByMonth` and `formatDate` (which has its own inline months array — duplication is fine, `MONTHS` and `formatDate`'s array are independent constants).

**Note on `MONTHS` duplication:** `formatDate` at the top of the file already defines its own months array inline. `groupByMonth` uses a module-level `MONTHS` constant. This is intentional — `formatDate` returns a date string with year+day, while `groupByMonth` uses month+year only. The arrays are short and the duplication is not worth abstracting.

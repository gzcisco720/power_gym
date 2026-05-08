# My Training — Cockpit Landing Design

**Status**: Draft
**Date**: 2026-05-08
**Scope**: `/trainer/my-training` and `/owner/my-training` landing pages
**Reference mock**: `docs/2026-05-08/mockups/my-training-cockpit.html`

---

## 1. Goal

Replace the current single-card landing (one `<StartWorkoutCard>` with two unlabeled buttons) with an information-dense **dual-path cockpit** that:

- Surfaces the trainer/owner's training context (streak, recent activity, last template usage) so they don't land on a blank surface.
- Presents the **two start paths — From Template / Freestyle — with equal visual weight**, each with its own preview of the action that path will trigger.
- Degrades gracefully across three data states (Full / Light / Empty) without collapsing into placeholder dashes.

The session-tracking flow itself (`/session/[id]`, calendar popover, complete dialog) is unchanged. This redesign is **landing-only**.

---

## 2. Page architecture

The page has four stacked regions. Each region is present in **all three states** — the content inside changes, the structure does not.

```
┌─ HEADER ────────────────────────────────────────────────┐
│ "My Training" h1 + sub-line + Calendar trigger          │
├─ ACTIVITY STRIP ────────────────────────────────────────┤
│ 14-day heatmap + month stats  /  Get-started 3-step     │
├─ HERO COCKPIT (TWO CARDS, EQUAL) ───────────────────────┤
│ Left: From Template (emerald accent)                    │
│ Right: Freestyle (sky accent)                           │
├─ RECENT SESSIONS ───────────────────────────────────────┤
│ List of last N sessions  /  empty preview row           │
└─────────────────────────────────────────────────────────┘
```

Layout grid: `grid-cols-2 gap-4` for the hero on desktop; stacks vertically on mobile (`< md`). Max width `max-w-5xl` to keep the two cards from over-stretching on wide displays.

---

## 3. State cascade

The page selects one of three states based on the trainer/owner's data:

| State | Trigger condition | Hero left | Hero right | Strip | Recent |
|---|---|---|---|---|---|
| **Full** | ≥ 4 sessions logged AND ≥ 1 template-derived session | "Day N — <dayName>" with cycle-progress dots, exercise preview, last weights | Last freestyle echo + frequency line | 14-day heatmap + month stats | Last 5 sessions |
| **Light** | 1–3 sessions logged, OR any number of sessions without ever using a template | If any template usage: "Day N — <dayName>" simplified (no last-weights). If never used a template: same as Empty left card (preset suggestions) | Last freestyle echo (if any), no frequency, no PR | Sparse heatmap + "Build a streak — log today" | Existing rows + "Newer sessions will land here" hint row |
| **Empty** | 0 sessions logged | "Pick a template" with **3 hard-coded preset suggestions** (PPL / Upper-Lower / Full Body) → click jumps to plan template create page with framework prefilled | "What you can do" 3-bullet list (pick on the fly / save as template / RPE + note) | 3-step onboarding (Pick path › Log sets › Mark complete) | Single dimmed example row + "Coming soon" explanation |

State is computed server-side in the page component before render. No client-side state-detection logic — the page hydrates with the right state already chosen.

---

## 4. Component breakdown

The current `StartWorkoutCard` is replaced. New components live in `src/components/self-tracking/`:

| Component | Responsibility |
|---|---|
| `MyTrainingLanding` (server) | Page composition. Fetches all data in parallel, computes state, renders the four regions. One per role (trainer/owner) is unnecessary — pass `basePath` like the existing card does. |
| `ActivityStrip` | 14-day heatmap + month stats (Full/Light) or 3-step onboarding (Empty). Pure presentational. |
| `TemplatePathCard` | Left card. Internal sub-states for Full / Light / Empty driven by props (no `<If>` branching at the page level). |
| `FreestylePathCard` | Right card. Same shape — one component, sub-states by props. |
| `RecentSessionsList` | Final region. Renders 0-5 rows + appropriate hint row. |
| `PresetTemplatePicker` (client) | Hard-coded list of 3 frameworks. On click, `router.push('/trainer/plans/new?preset=<key>')`. Lives inside `TemplatePathCard` empty branch. |

The two path cards expose the same outer shape (eyebrow, title, body, footer with primary + ghost button) so the cockpit reads as a true pair, not "two unrelated cards that happen to be side by side."

---

## 5. Data requirements

All fetches happen server-side in `MyTrainingLanding` and run in parallel.

### Already available
- `findActive(userId)` — for the "Continue: ..." override (existing behavior preserved).
- `findByUserMonth(userId, year, month)` — feeds the heatmap (current month) and month stats.

### New
1. **`findRecent(userId, limit)`** on `SelfWorkoutLogRepository` — last N completed logs sorted by `completedAt desc`. Used by the recent-sessions list and as the source for "last freestyle" + "last template usage" derivations. `limit = 10` is enough (we display ≤ 5; we use the rest to find the most recent freestyle if not in the top 5).
2. **`findLastByTemplate(userId)`** on `SelfWorkoutLogRepository` — most recent log where `sourceTemplateId IS NOT NULL`. Returns the log + the inferred "next day in rotation" (just `(prev.sourceTemplateDayNumber % template.totalDays) + 1`). Used by the Full state left card.
3. **`SelfPersonalBest` model + repo** (new) — same shape as the existing `personal-best.repository.ts` for member workouts but indexed on `userId`. The 1RM Epley computation is extracted into a shared `lib/training/one-rep-max.ts` helper so member and self code share it. `complete()` on `self-workout-log` is extended to scan the log's heaviest set per exercise and upsert PRs, surfacing a `prs: number` flag on the saved log so the UI can paint the badge without an extra query.

### Endpoint surface
The server component reads repos directly (no HTTP). The existing client `StartWorkoutCard` fetched `/api/me/workout-logs/active` because it was a client island; the new landing is a server component, so that call disappears. The legacy endpoint stays for the session page's "active" probe.

---

## 6. Empty state strategy (the anti-collapse contract)

This is the load-bearing rule of the design. **Every region must render visible content in the Empty state.** No region may degrade to `—` placeholder dashes or an empty `<div>`.

| Region | Empty content |
|---|---|
| Header sub-line | A one-sentence value statement: "Track your own sessions here — kept separate from your members'." |
| Activity strip | 3-step onboarding flow ("Pick path › Log sets › Mark complete") with numbered chips. No heatmap squares (which would all be empty). |
| Left card body | 3 hard-coded preset template suggestions, each clickable, plus a one-line link to "import one you've built for a member." |
| Right card body | 3-bullet "what you can do" list. Each bullet is a real capability of freestyle, not filler. |
| Recent list | A single dimmed example row showing the schema ("Tue · PPL · Day 2 · Pull · 8 sets · 52 min · RPE 7") + an explanation paragraph: "Once you finish your first session, you'll see a recap row here." |

The example row in the Recent region is the most subjective choice. If reviewers find it confusing rather than instructive, fall back to a plain `<p>` "No sessions yet" — but that's the option of last resort.

---

## 7. Visual / token rules

The page lives inside the project's design system (CLAUDE.md section "Design Guidelines"). Specifically:

- All secondary text is `text-foreground/65`, never `text-muted-foreground` or hex greys.
- Card surfaces are `bg-card ring-1 ring-foreground/10`.
- Numeric output uses `font-variant-numeric: tabular-nums` (the mock's `.num` class) so streak counts and weights line up.
- Two-card grid stacks on `< md` breakpoint.
- Emerald is the template-path accent; sky is the freestyle accent. These two colors are **not** otherwise used as accents in the cockpit — they're path markers. PR badges use amber, matching the existing macro palette convention.

The mock uses placeholder hex (`#0a0a0a`, `#080808`, `#0c0c0c`) for the static preview. The real implementation must use the project's theme tokens (`bg-background`, `bg-card`, `bg-[hsl(var(--surface))]` if a surface token exists — otherwise `bg-card` everywhere works).

---

## 8. Testing strategy

Unit / integration (Jest + RTL):

- `MyTrainingLanding` renders correct state given mocked repo returns: 0 logs → Empty, 2 logs (no template) → Light with empty template card, 5 logs (mixed) → Full.
- `TemplatePathCard` and `FreestylePathCard` each have one test per sub-state asserting the right copy + actions.
- `RecentSessionsList` renders the right hint row at each density.
- `findRecent` and `findLastByTemplate` repository methods get unit coverage with in-memory fixtures (existing `__tests__/lib/repositories/` pattern).

E2E (Playwright):

- New trainer (no logs): page loads, three preset rows appear, click "PPL" → navigates to `/trainer/plans/new?preset=ppl` (page receives the param; actual prefill is verified by the existing plans-new e2e if it covers this).
- Trainer with mid-cycle template usage: "Continue Day 3" button is the primary CTA and starts a new log derived from the right template day.
- Freestyle from cockpit: clicking "Start blank" creates a new log with `dayName: 'Freestyle'` and routes to the session page (existing flow, just verifying the new entry point still wires through).

---

## 9. Out of scope (for this redesign)

- Session-page changes (`/session/[id]`).
- Nutrition tab on this landing.
- Template editor changes — preset prefill logic on `/trainer/plans/new?preset=ppl` is in scope, but the editor UI is unchanged.
- Mobile-specific layouts beyond the existing breakpoint stack.
- Owner-vs-trainer feature divergence — both roles get the identical cockpit, distinguished only by `basePath`.

---

## 10. Open questions

None at design time. (Two pre-design questions — preset implementation strategy and PR detection — were answered: hard-code presets in the client + new SelfPersonalBest model with shared Epley helper.)

# Pricing & Billing Management — Design Spec

**Date:** 2026-05-22
**Status:** Approved

---

## Overview

Introduce service type pricing management and a billing summary system based on completed scheduled sessions. No checkout or payment processing in this iteration — this is purely a management and display feature.

---

## Decisions Made

| Question | Decision |
|---|---|
| Pricing scope | Gym-wide, Owner manages global service catalog |
| Completion trigger | ScheduledSession: date < now AND status = 'scheduled' |
| Service type granularity | Per session/series (set at booking time; recurring series inherit) |
| Billing summary location | Dedicated Billing page + Member Hub Billing Tab + Member self-view |
| Billing period | Default current month, supports custom date range |
| Member visibility | Members can see their own billing (read-only) |
| Implementation approach | Real-time aggregation — no materialized BillingRecord collection |

---

## Data Model

### New: `ServiceType` collection

```ts
interface IServiceType {
  _id: ObjectId;
  name: string;           // "1小时私教"
  durationMin: number;    // 60
  pricePerSession: number; // 300
  currency: string;       // "CNY"
  isActive: boolean;      // soft-delete — inactive types preserved for history
  createdBy: ObjectId;    // must be Owner
  createdAt: Date;
}
```

**Index:** `{ isActive: 1 }`

**Invariant:** Never physically deleted. Deactivation (`isActive: false`) preserves existing sessions that reference this type.

### Modified: `ScheduledSession` — one new field

```ts
serviceTypeId: ObjectId | null;  // null = no service linked
```

Nullable — existing sessions and sessions created without a service type remain `null` and are excluded from billing. Recurring series: all 12 generated sessions share the same `serviceTypeId`. When editing a series with `scope: 'future' | 'all'`, `serviceTypeId` updates follow the same logic as `startTime`/`endTime`.

### Billing calculation (no new collection)

```ts
// Completed sessions for a member in [from, to]
ScheduledSession.find({
  memberIds: memberId,
  date: { $gte: from, $lte: min(to, now) }, // exclude future sessions
  status: 'scheduled',                        // not cancelled
  serviceTypeId: { $ne: null },               // has a service type
}).populate('serviceTypeId')

// total = sum of session.serviceTypeId.pricePerSession
```

---

## API Routes

### Service type management — `/api/service-types`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/service-types` | Owner | List all (including inactive) |
| GET | `/api/service-types/active` | Owner + Trainer | List active only — used in session modal dropdown |
| POST | `/api/service-types` | Owner | Create new service type |
| PATCH | `/api/service-types/[id]` | Owner | Edit name / price / duration / isActive |

No DELETE endpoint — deactivation via `PATCH { isActive: false }`.

### Billing — `/api/billing`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/billing?from=&to=` | Owner / Trainer | Global summary grouped by member. Owner: all members. Trainer: own members only. |
| GET | `/api/billing/member/[id]?from=&to=` | Owner / Trainer / Member (self) | Per-member detail: each session + amount + total |

**Response shape (global summary):**

```ts
{
  members: [{
    memberId: string;
    name: string;
    trainerName: string;      // omitted in Trainer view
    sessionsCount: number;
    serviceTypeName: string;  // most frequent, or "Mixed" if multiple
    totalAmount: number;
    currency: string;
    breakdown: Array<{ sessionId, date, startTime, endTime, serviceTypeName, price }>;
  }];
  grandTotal: number;
  currency: string;
}
```

### Existing calendar routes — minimal change

- `POST /api/schedule` — body gains optional `serviceTypeId?: string`
- `PATCH /api/schedule/[id]` — `serviceTypeId` supported in scope updates (same logic as other fields)

---

## Pages & Components

### New pages

| Page | Path | Role |
|---|---|---|
| Service type management | `/owner/services` | Owner only |
| Global billing summary | `/owner/billing` | Owner |
| Trainer billing summary | `/trainer/billing` | Trainer |
| Member billing | `/member/billing` | Member |

### `/owner/services`

List of service types with name, duration, price, active badge, and edit pencil. Add Service opens a Dialog (shadcn). Deactivate via toggle in edit dialog — no delete button exposed. Inactive types shown dimmed at the bottom.

### `/owner/billing` and `/trainer/billing`

- Month navigation (◀ current month ▶) + optional custom date range picker
- Table: Member | (Trainer — Owner only) | Service Type | Sessions | Amount
- Click a row → navigate to that member's Member Hub Billing Tab
- Grand total shown below the table

### Member Hub Billing Tab

Added to existing tab nav in `/owner/members/[id]` and `/trainer/members/[id]`:

- Month navigation + monthly total (large)
- Summary line: "X sessions · Service name · ¥Y / session"
- Session detail list: date, time range, price per row

### `/member/billing`

Same data as Member Hub Billing Tab, rendered in member's own view. Read-only. Default current month with month navigation.

### Calendar modal change

`CreateSessionModal` and `EditSessionModal` gain a new optional field:

```
SERVICE TYPE (optional)
[1小时私教 ▾]        ¥300 / session
```

Dropdown pulls from `GET /api/service-types/active`. Price shown inline on selection. Recurring series: the chosen service type is written to all generated sessions.

---

## Navigation Updates

```
Owner sidebar   → add: Services (/owner/services), Billing (/owner/billing)
Trainer sidebar → add: Billing (/trainer/billing)
Member sidebar  → add: Billing (/member/billing)
Member Hub tabs → add: Billing tab (in owner + trainer member hub)
```

---

## File Structure

```
src/
  app/
    (dashboard)/
      owner/
        services/
          page.tsx
          _components/
            service-type-list.tsx
            service-type-dialog.tsx   # create + edit
        billing/
          page.tsx
          _components/
            billing-summary-client.tsx
      trainer/
        billing/
          page.tsx                    # reuses BillingSummaryClient
      member/
        billing/
          page.tsx
          _components/
            member-billing-client.tsx
    api/
      service-types/
        route.ts                      # GET list, POST create
        active/
          route.ts                    # GET active only
        [id]/
          route.ts                    # PATCH edit/deactivate
      billing/
        route.ts                      # GET global summary
        member/
          [id]/
            route.ts                  # GET per-member detail
  components/
    calendar/
      create-session-modal.tsx        # modified — add service type field
      edit-session-modal.tsx          # modified — add service type field
    billing/
      member-billing-detail.tsx       # shared between hub tab + member page
      billing-period-nav.tsx          # month nav + custom range picker
  lib/
    db/models/
      service-type.model.ts           # new
    repositories/
      service-type.repository.ts      # new
    billing/
      calculate-billing.ts            # getCompletedSessionBilling(memberId, from, to)
```

---

## Testing

### Unit / Integration (Jest)

- `ServiceTypeRepository`: create, list active, deactivate
- `calculateBilling`: correct sum, excludes cancelled sessions, excludes null serviceTypeId, excludes future sessions
- API route auth: Trainer cannot call `POST /api/service-types`; Member cannot call `GET /api/billing`

### E2E (Playwright)

| Spec | Flow |
|---|---|
| `e2e/owner/service-types.spec.ts` | Owner creates service type → appears in calendar dropdown |
| `e2e/owner/billing.spec.ts` | Owner schedules session with past date + service type → appears in billing summary with correct amount (use past date at creation, no real-time wait needed) |
| `e2e/member/billing.spec.ts` | Member views own billing page → correct sessions and total shown |

---

## Out of Scope (this iteration)

- Checkout / payment processing
- Invoice PDF generation
- Per-trainer price overrides
- Payment status tracking (paid / unpaid)
- Email billing summaries
- Multi-currency conversion

# Data Export — Design

## Overview

CSV export for body tests and training sessions, accessible from both trainer/owner and member views. Uses a shared `ExportCsvButton` client component that downloads via `fetch` + blob URL to avoid triggering the `NextTopLoader` progress bar.

## Export Endpoints

| Route | Auth | Description |
|---|---|---|
| `GET /api/members/[memberId]/body-tests/export` | trainer/owner only | Per-member body test CSV |
| `GET /api/members/[memberId]/sessions/export` | trainer/owner only | Per-member session CSV |
| `GET /api/me/body-tests/export` | member (self) | Own body test CSV |
| `GET /api/me/sessions/export` | member (self) | Own session CSV |

## CSV Schemas

**Body tests**: `Date, Weight (kg), Body Fat (%), Fat Mass (kg), Lean Mass (kg), Protocol`

**Sessions**: `Date, Day Name, Exercise, Set, Weight (kg), Reps`

## Shared Component

`src/components/shared/export-csv-button.tsx` — programmatic download (no router navigation):

```tsx
const res = await fetch(url);
const blob = await res.blob();
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = filename;
a.click();
```

## Entry Points

- Trainer/Owner → Member Body Tests page
- Trainer/Owner → Member Session History (plan page)
- Member → Body Composition page (`/member/body-tests`)
- Member → My Training page (`/member/my-training`)

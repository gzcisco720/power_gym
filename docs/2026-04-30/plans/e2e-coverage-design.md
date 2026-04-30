# E2E Coverage Completion — Design Spec

## Goal

Fill Playwright E2E coverage gaps for three features added after the original E2E plan: Health tab (member injuries), Equipment management, and Settings pages.

## Scope

### New Spec Files

| File | Role | Feature |
|---|---|---|
| `e2e/trainer/member-health.spec.ts` | Trainer | Health tab — view, add, resolve |
| `e2e/owner/equipment.spec.ts` | Owner | Equipment CRUD |
| `e2e/trainer/settings.spec.ts` | Trainer | Settings — save and persist |
| `e2e/member/settings.spec.ts` | Member | Settings — save and persist |
| `e2e/owner/settings.spec.ts` | Owner | Settings — save and persist |

### Modified Files

- `e2e/seed.ts` — add `MemberInjury` and `Equipment` seed records

---

## Seed Additions

### MemberInjury

```ts
MemberInjuryModel.create({
  memberId: member._id,
  title: 'Left knee strain',
  status: 'active',
  recordedAt: new Date(),
  trainerNotes: null,
  memberNotes: null,
  affectedMovements: 'Avoid squats, lunges',
})
```

Purpose: Provides a stable active injury for Health tab rendering and resolve tests.

### Equipment

Three records are seeded to keep tests independent:

```ts
// stable list item — never modified by any spec
EquipmentModel.create({ name: 'E2E Barbell', category: 'strength', status: 'active' })

// dedicated to edit test — rename only, never deleted
EquipmentModel.create({ name: 'E2E Edit Equipment', category: 'free_weight', status: 'active' })

// dedicated to delete test — deleted by that spec only
EquipmentModel.create({ name: 'E2E Delete Equipment', category: 'cardio', status: 'active' })
```

Purpose: Each destructive operation has its own record so tests are independent and can run in any order.

---

## Test Cases

### `e2e/trainer/member-health.spec.ts`

Uses `storageState: 'e2e/.auth/trainer.json'`. Navigates to the seeded member's hub.

1. **Health tab is visible in member hub nav** — navigate to hub, expect `getByRole('link', { name: 'Health' })` to be visible.
2. **Active section shows seeded injury** — navigate to Health tab, expect `"Left knee strain"` to be visible.
3. **Add new injury** — click `+ Add`, fill title `"Shoulder impingement"`, click Save → expect `"Shoulder impingement"` to appear in Active list.
4. **Resolve injury** — click Resolve on the seeded injury → expect it to disappear from Active and appear under Resolved.

### `e2e/owner/equipment.spec.ts`

Uses `storageState: 'e2e/.auth/owner.json'`. Navigates to `/owner/equipment`.

1. **List shows seeded equipment** — expect `"E2E Barbell"` to be visible.
2. **Create new equipment** — click Add, fill name `"E2E Treadmill"`, select category `"cardio"`, submit → expect `"E2E Treadmill"` in list.
3. **Edit equipment** — click edit on `"E2E Edit Equipment"`, change name to `"E2E Edit Equipment Updated"`, save → expect updated name in list.
4. **Delete equipment** — click delete on `"E2E Delete Equipment"`, confirm dialog → expect item no longer in list.

### `e2e/trainer/settings.spec.ts`

Uses `storageState: 'e2e/.auth/trainer.json'`. Navigates to `/trainer/settings`.

1. **Save phone and bio, verify persistence** — fill `phone` input with `"0400000001"` and `bio` with `"E2E trainer bio"`, click Save, reload page → expect both fields to show the saved values.

### `e2e/member/settings.spec.ts`

Uses `storageState: 'e2e/.auth/member.json'`. Navigates to `/member/settings`.

1. **Save phone, verify persistence** — fill `phone` with `"0400000002"`, click Save, reload page → expect phone field to show `"0400000002"`.

### `e2e/owner/settings.spec.ts`

Uses `storageState: 'e2e/.auth/owner.json'`. Navigates to `/owner/settings`.

1. **Save phone and gym name, verify persistence** — fill `phone` with `"0400000003"` and `gymName` with `"E2E Gym"`, click Save, reload page → expect both fields to show the saved values.

---

## Architecture Notes

- All new specs follow the existing pattern: `test.use({ storageState })` + `test.describe` + individual `test()` blocks.
- Seed imports `MemberInjuryModel` and `EquipmentModel` from their respective model files.
- Settings tests use `page.reload()` after save to verify persistence via the server re-render (not just client state).
- No new auth setup is required — all three roles already have saved auth state from `global-setup.ts`.

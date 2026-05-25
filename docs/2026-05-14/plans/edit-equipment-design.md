# Edit Equipment — Design Spec

**Date**: 2025-05-14  
**Status**: Approved

---

## Overview

Replace the existing `ConditionDialog` with a unified `EditEquipmentDialog` that has two tabs: **Details** (edit equipment fields) and **Condition** (condition reports, migrated from ConditionDialog). The "Condition" button in the equipment row becomes "Edit".

---

## UI

### Equipment row change
- "Condition" button → "Edit" button (same position, same styling)
- Clicking "Edit" opens `EditEquipmentDialog` with **Details tab active by default**

### EditEquipmentDialog

- **Size**: `max-w-xl` (560 px), `max-h-[90vh]` scrollable
- **Title**: equipment name
- **Tabs**: Details | Condition (shadcn `Tabs` component)

#### Details tab

Single-column form with:

| Field | Notes |
|---|---|
| Name | Required. Text input with catalog autocomplete (same as AddEquipmentDialog) |
| Brand | Optional |
| Quantity | Number input, min 1 |
| Note | Optional |
| Track Condition | Toggle switch |
| Status | Select; only rendered when `trackCondition = true` |
| Images | Show existing images with remove (×); add new via file upload (max 5 total) |

- **Save Changes** button: PATCH `/api/owner/equipment/[id]` with all fields. Disabled while saving or when no changes (dirty detection via JSON snapshot).
- On success: call `onUpdated(updatedItem)` → parent updates local list. Toast success.
- **Cancel** button: close dialog (if dirty, use shadcn Dialog's `onOpenChange` to intercept — no confirm needed given low-stakes edits).

#### Condition tab

Identical functionality to current `ConditionDialog`:
- Status block (show/edit) — visible only when `trackCondition = true`
- Add Report form (toggled by "+ Add Report" button)
- Condition report history list (newest first, fetched from `/api/owner/equipment/[id]/condition-reports`)

Status changes in Condition tab also call `onUpdated` so the parent list reflects the new status immediately.

---

## Component Props

```tsx
interface Props {
  equipment: EquipmentItem | null;   // null = closed
  onClose: () => void;
  onUpdated: (item: EquipmentItem) => void;
}
```

`EquipmentItem` already includes all needed fields (`name`, `brand`, `quantity`, `note`, `images`, `status`, `trackCondition`).

---

## Data Flow

```
EquipmentClient
  editTarget: EquipmentItem | null
  handleUpdated(item) → setItems(map replace) + update editTarget
  
  "Edit" button → setEditTarget(item)
  
  EditEquipmentDialog
    Details tab → PATCH /api/owner/equipment/[id] → onUpdated
    Condition tab → PATCH status → onUpdated
                  → POST condition-report (local list update only)
```

---

## Files

| Action | File |
|---|---|
| Create | `src/app/(dashboard)/owner/equipment/_components/edit-equipment-dialog.tsx` |
| Delete | `src/app/(dashboard)/owner/equipment/_components/condition-dialog.tsx` |
| Modify | `src/app/(dashboard)/owner/equipment/_components/equipment-client.tsx` |
| Update | `__tests__/app/owner/equipment-client.test.tsx` |
| Update | `e2e/owner/equipment.spec.ts` |

No backend changes — `PATCH /api/owner/equipment/[id]` already accepts all `UpdateEquipmentData` fields.

---

## Tests

### Unit tests (`equipment-client.test.tsx`)
- Rename "Condition button" tests → "Edit button" tests
- Add: clicking Edit opens dialog
- Add: dialog renders Details tab by default
- Add: saving changes calls PATCH with all fields
- Add: Condition tab renders condition content

### E2E tests (`equipment.spec.ts`)
- Update: "Condition" button → "Edit" button in all selectors
- Update: dialog title selector (`Condition — X` → equipment name)
- Update: status update test path (Edit → Condition tab → Edit status)
- Add: edit details test (open Edit, change name/note, save, verify list updated)

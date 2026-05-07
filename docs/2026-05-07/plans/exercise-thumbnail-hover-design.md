# Exercise Thumbnail Hover Preview — Design Spec

**Date:** 2026-05-07  
**Status:** Approved

---

## Overview

When a user hovers over an `ExerciseThumbnail` that has a real image, a floating card appears showing a larger version of the image plus the exercise name. Thumbnails with no image (dumbbell placeholder) get no hover behavior.

---

## Component Change

**File:** `src/components/training/exercise-thumbnail.tsx`

Add `'use client'` directive. The component gains:

- `useRef<HTMLDivElement | null>` on the thumbnail wrapper to read its position
- `useState<boolean>` for hover visibility
- A `showTimer` ref (`ReturnType<typeof setTimeout>`) to implement 150ms open delay

No other files change. All 5 call sites (`plan-template-form`, `exercise-search-sheet`, `session-logger`, `plan-overview`, `session-detail-panel`) inherit the feature automatically.

---

## Behavior

| Condition | Behavior |
|-----------|----------|
| `imageUrl` is non-null | Hover triggers popup |
| `imageUrl` is null | No hover; placeholder renders as before |
| Mouse enters thumbnail | Start 150ms timer |
| Mouse leaves before 150ms | Cancel timer; popup never shows |
| Mouse leaves after popup visible | Close popup immediately |

---

## Popup Positioning

Use `getBoundingClientRect()` on the thumbnail ref to compute `position: fixed` coordinates:

1. **Vertical**: vertically centered on the thumbnail (`top = rect.top + rect.height/2`)
2. **Horizontal — default right**: `left = rect.right + 8px`
3. **Horizontal — flip left**: if `rect.right + 160 > window.innerWidth`, render to the left instead (`left = rect.left - 160 - 8px`)

The popup is rendered inside the component itself (no portal needed — `position: fixed` already escapes `overflow: hidden` parents).

---

## Popup Card Appearance

```
width: 140px
image: full width, height 96px, rounded-md, object-cover
name: text-[11px] font-semibold text-foreground text-center mt-2
container: bg-[#1c1c1c] border border-foreground/10 rounded-xl p-2 shadow-2xl
z-index: z-50
```

---

## Testing

- Unit test (Jest + RTL): hover on a thumbnail with `imageUrl` → popup appears; hover on one without → no popup
- Verify popup does not appear during 150ms window (fast mouse-over)
- Manual check at each of the 5 call sites that popup is not clipped

# Design Guidelines

Every rule in this section was learned the hard way from a real bug or rejected design — read it before touching any UI.

## Color Tokens — The Rule

The theme is near-black (`bg-background` ≈ oklch 0.04). Picking the wrong "muted" token makes text invisible.

**For visible secondary text, always use `text-foreground/65`.** Never use `text-muted-foreground`, `text-[#555]/[#666]/[#777]/[#888]`, or any other dim hex.

**Primary accent** — `bg-primary` / `text-primary-light`

The primary accent colour is **indigo** (`oklch(0.585 0.233 277.1)` / `#6366f1`). Use `bg-primary` for primary buttons, active states, and icon container gradients. Use `text-primary-light` (`#a5b4fc`) for glow text and badge labels. **Emerald is now the success/completion colour only** — do not use it as the main brand colour.

| Use | For | Why not the alternative |
|---|---|---|
| `text-foreground` | Primary text, names, values | — |
| `text-foreground/80` | Form labels | Slightly de-emphasized but still strong |
| `text-foreground/65` | Helper text, section labels, unit suffixes ("kcal", "/100g"), brand chains, "(optional)", subtitles, Cancel buttons, dialog body, chip metadata | `text-muted-foreground` resolves to oklch 0.38 ≈ #616161 — fails WCAG AA on this background |
| `text-destructive` | Required `*`, destructive button hover | — |
| `bg-card` + `ring-1 ring-foreground/10` | Card surfaces | `bg-[#0c0c0c] border-[#141414]` is the same in pixels but loses theme switching |
| `bg-muted` | Chip backgrounds, hover states | — |

**Never hardcode hex colors.** Migrate any `text-[#xxx]` / `bg-[#xxx]` / `border-[#xxx]` you encounter.

## Animation Tokens

All Framer Motion config lives in `src/lib/animations/variants.ts`. Import from there — never define inline spring configs.

| Variant | Use |
|---|---|
| `variants.fadeSlideUp` | Page-level content entry |
| `variants.staggerContainer` + `variants.staggerItem` | List/grid entries |
| `variants.scaleIn` | Badges, dialogs, toasts |
| `springs.bouncy` | Stat numbers, checkmarks |
| `springs.snappy` | Button press feedback |

Page transitions are handled automatically by `PageTransition` in the dashboard layout.

**Macro palette** — fixed across the app: Protein **emerald**, Carbs **amber**, Fat **pink**, kcal **neutral white**. Use the `<MacroPill>` component (`src/components/nutrition/macro-pill.tsx`).

## Spacing & Density

- **Cards must be information-dense.** Never a card that's mostly whitespace with one or two pieces of text.
- **Use horizontal space.** Default to `flex items-center justify-between` — name on the left, secondary info (macros, dates, counts) pushed right with `ml-auto` or `shrink-0`. Stacking everything vertically wastes the right half of the screen.
- **Single row preferred; second row only when content demands it.** If servings/tags exist, put them on a `mt-1.5` second row. If they don't, the card is one line.
- **Compact list-card padding**: `px-3 py-2`. Title `text-sm` (14px). Macros `text-xs` (12px). Chips `text-[10px]`.
- **Section labels**: 11px uppercase tracking-wider (`text-[11px] uppercase tracking-wider text-foreground/65 font-semibold`). Body helper text 12px (`text-xs`). Don't go below 12px for prose.
- **Lists use `space-y-1.5` to `space-y-2`**, not `space-y-4`. Tight beats airy on dense pages.

## Form Patterns

- **No native `confirm()` / `alert()`.** Use the shadcn `<Dialog>` for confirmations, with explicit `Cancel` + `Delete`/`Discard` buttons.
- **Sticky bottom action bar on full-page forms.** Pattern: `sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60`. Save button never below the fold.
- **Dirty detection.** Snapshot initial state with `useMemo(() => JSON.stringify(initial), [initial])`. Disable Save when not dirty in edit mode, and intercept Cancel with a "Discard changes?" dialog when dirty. Add a `beforeunload` guard.
- **Numeric inputs** use `type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*"` — `type="number"` lets the scroll wheel silently change values.
- **Required vs optional**: required gets a red `*` (`text-destructive`); optional gets a `(optional)` hint in `text-foreground/65`.
- **Optional / advanced fields collapse by default.** Long forms with 10+ fields scare new users. Auto-expand only if there are pre-filled values (edit mode).
- **Field order = importance.** Required core → required structural (e.g. servings) → optional micros. Don't bury required fields under optional ones.
- **Per-100g / per-unit ambiguity always needs a one-line helper text** under the section header.

## List Patterns

- **Whole-card `<Link>` for the primary action**, with corner / hover-revealed icon button for destructive actions (delete). Don't nest `<a>` inside `<a>` — put the destructive button as an absolute-positioned sibling.
- **Hover affordance must be visible.** `ring-foreground/10` → `ring-foreground/25` is enough. `border-[#141414]` → `border-[#2a2a2a]` is invisible.
- **Loading state = `<Skeleton>` rows matching the final card shape**, not a centered "Loading…" string.
- **Search inputs**: left search icon + right clear button (`X`) when value present + right spinner when in-flight, mutually exclusive on the right.
- **Toast feedback** (`sonner`) for delete success / save success / network error.

## Component Pitfalls

- **shadcn `<Card>` defaults to `flex flex-col gap-4 py-4`.** Adding `className="flex items-start justify-between"` does **not** override `flex-col` — `tailwind-merge` keeps it. Result: children stack vertically with empty space pushed between them. If you need horizontal layout, use a plain `<div>` wrapper or render `<div>` directly with the surface classes (`rounded-xl bg-card ring-1 ring-foreground/10`).
- **Don't override `<Input>` / `<Card>` with hardcoded hex.** The defaults already use theme tokens. Custom `INPUT_CLASS = "bg-[#0c0c0c] border-[#222]"` strings are pure tech debt.
- **Forms in Dialogs/Sheets only — never mix form + list on the same page.** Dedicated full-page forms are OK only for genuinely complex multi-section forms (food, nutrition template, training plan).

## Accessibility Minimums

- WCAG AA contrast ≥ 4.5:1 for body text (`text-foreground/65` passes; `text-muted-foreground` does not).
- Every icon-only button needs `aria-label`.
- Every collapse toggle needs `aria-expanded`.
- Focus rings: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40` (or `ring-destructive/40` on destructive buttons).
- Form fields: `<Label htmlFor=...>` paired with `id` on the input; `<input aria-label>` only when no visible label exists.

## Reference Implementations

When in doubt, copy the pattern from:

- **List cards**: `src/app/(dashboard)/trainer/foods/_components/foods-list-client.tsx`
- **Form with sticky bar + dirty detection + collapse**: `src/components/nutrition/food-form.tsx`
- **Inline meal/item rows**: `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx`
- **Macro pills**: `src/components/nutrition/macro-pill.tsx`

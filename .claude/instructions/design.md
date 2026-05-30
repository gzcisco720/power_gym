# Design Guidelines

Every rule in this section was learned the hard way from a real bug or rejected design — read it before touching any UI. This document is the single source of truth for both `web/` and `mobile/`. The two platforms must be visually consistent: same color palette, same typography hierarchy, same density principles.

---

# Web (`web/`)

## Theme System & CSS Variables

The theme is near-black. All values use the **oklch color space**.

```css
--background:         oklch(0.04 0 0)          /* page bg */
--foreground:         oklch(1 0 0)             /* primary text (white) */
--card:               oklch(0.07 0 0)          /* card surface */
--popover:            oklch(0.05 0 0)          /* modal/dropdown surface */
--primary:            oklch(0.585 0.233 277.1) /* indigo — brand accent */
--primary-light:      oklch(0.746 0.161 277.1) /* lighter indigo — glow text, badge labels */
--secondary:          oklch(0.09 0 0)
--muted:              oklch(0.09 0 0)          /* chip bg, hover states */
--muted-foreground:   oklch(0.38 0 0)          /* ≈ #616161 — FAILS WCAG AA on bg */
--destructive:        oklch(0.577 0.245 27.325) /* red */
--border:             oklch(0.09 0 0)
--input:              oklch(0.13 0 0)
--ring:               oklch(1 0 0)             /* white focus ring */
--radius:             0.75rem                  /* base; sm=60%, md=80%, lg=100%, xl=140% */
```

**Font**: Space Grotesk (`var(--font-space-grotesk)`) for all text.

---

## Color Tokens — The Rule

**For visible secondary text, always use `text-foreground/65`.** Never use `text-muted-foreground` — it resolves to oklch 0.38 ≈ #616161, which fails WCAG AA on this background.

| Token | Use |
|---|---|
| `text-foreground` | Primary text, names, stat values |
| `text-foreground/80` | Form labels |
| `text-foreground/65` | Helper text, section labels, unit suffixes, "(optional)", subtitles, Cancel buttons, dialog body, chip metadata |
| `text-foreground/60` | Muted text |
| `text-foreground/40` | Very subtle, placeholder-level |
| `text-foreground/35` | Inactive states (e.g. unfinished set chips) |
| `text-destructive` | Required `*`, destructive button text |
| `text-primary` | Primary link text |
| `text-primary-light` | Glow text, badge labels |
| `bg-card` + `ring-1 ring-foreground/10` | Card surfaces |
| `bg-muted` | Chip backgrounds, hover states |
| `bg-background/95` + `backdrop-blur-sm` | Sticky headers, overlays |

**Primary accent is indigo** — `bg-primary` for buttons, active states, icon gradients. `text-primary-light` for glow/badge labels.

**Semantic accent colors** (not theme variables — use as-is):
- `emerald-500` — success, completion, Protein macro
- `amber-500` — warnings, achievements, Carbs macro
- `pink-500` — emphasis, Fat macro
- Pattern: `bg-emerald-500/10 ring-emerald-500/20` (tinted surface), `text-emerald-300` (text on dark)

**Never hardcode hex colors.** `text-[#888]`, `bg-[#0c0c0c]`, `border-[#1e1e1e]` and similar are tech debt — migrate to tokens on sight.

---

## Typography

**Size hierarchy:**

| Class | px | Use |
|---|---|---|
| `text-[11px]` | 11 | Section labels, form field labels (uppercase) |
| `text-[10px]` | 10 | Small badges, chips, exercise labels |
| `text-xs` | 12 | Helper text, subtitles, macro values, card descriptions |
| `text-[13px]` | 13 | Body text variant, empty state descriptions |
| `text-sm` | 14 | Card titles, dialog content, inputs (desktop) |
| `text-base` | 16 | Inputs (mobile), body |
| `text-[18px]` | 18 | Page title |
| `text-2xl` | 24 | Stat values |

**Canonical text patterns:**

```
Page title:      text-[18px] font-semibold tracking-[-0.3px]
Section label:   text-[11px] font-semibold uppercase tracking-wider text-foreground/65
Form label:      text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65
Page subtitle:   text-[12px] text-foreground/65 mt-0.5
Stat value:      text-2xl font-semibold leading-none tracking-tight tabular-nums
Empty heading:   text-[15px] font-semibold
Empty body:      text-[13px] text-foreground/65
```

Never go below `text-xs` (12px) for prose. `text-[11px]` is label-only.

---

## Animation System

All Framer Motion config lives in `web/src/lib/animations/variants.ts`. Import from there — never define inline spring configs.

**Springs:**

| Name | Config | Use |
|---|---|---|
| `springs.default` | stiffness 300, damping 30 | Standard transitions |
| `springs.bouncy` | stiffness 400, damping 18 | Stat numbers, checkmarks, completion states |
| `springs.snappy` | stiffness 600, damping 35 | Button press feedback |

**Variants:**

| Variant | Use |
|---|---|
| `variants.fadeSlideUp` | Page-level content entry (fade + slide up 12px) |
| `variants.staggerContainer` + `variants.staggerItem` | List/grid entries (0.06s delay per child, fade + slide up 10px) |
| `variants.scaleIn` | Badges, dialogs, toasts (scale from 0.85, bouncy spring) |
| `variants.pageEnter` / `variants.pageExit` | Page transitions (slide right in, slide left out) |

Page transitions are handled automatically by `<PageTransition>` in the dashboard layout — do not re-implement per-page.

Use `<LazyMotion features={domAnimation}>` for deferred loading. Always call `useReducedMotion()` and respect it for accessibility.

---

## Spacing & Density

**Cards must be information-dense.** A card with one or two items and large whitespace is wrong.

**Use horizontal space.** Default to `flex items-center justify-between` — name on the left, secondary info on the right. Vertical stacking wastes the right half of the screen.

| Context | Rule |
|---|---|
| List card padding | `px-3 py-2` |
| List spacing | `space-y-1.5` to `space-y-2` — never `space-y-4` |
| Gap between flex children | `gap-2` default; `gap-1.5` or `gap-3` for density variants |
| Form section spacing | `space-y-4` between sections, `space-y-1.5` between label+input |
| Page section spacing | `space-y-6` |
| Sticky footer | `px-4 sm:px-8 py-3` |
| Page header padding | `px-4 sm:px-8 py-4 sm:py-5` |

---

## Page Header Pattern

```jsx
<div className="sticky top-0 z-10 flex items-center justify-between
  border-b border-foreground/[.06] bg-background/95 backdrop-blur-sm
  px-4 py-4 sm:px-8 sm:py-5">
  <div>
    <h1 className="text-[18px] font-semibold tracking-[-0.3px]">{title}</h1>
    {subtitle && <p className="mt-0.5 text-[12px] text-foreground/65">{subtitle}</p>}
  </div>
  {actions && <div className="flex items-center gap-2.5">{actions}</div>}
</div>
```

---

## Form Patterns

**No native `confirm()` / `alert()`.** Use a Dialog component with explicit `Cancel` + `Delete`/`Discard` buttons.

**Sticky bottom action bar on full-page forms:**
```jsx
<div className="sticky bottom-0 z-10 flex items-center gap-2 px-4 sm:px-8 py-3
  border-t border-foreground/10 backdrop-blur-md bg-background/50">
  <Button variant="ghost">Cancel</Button>
  <Button disabled={!isDirty}>Save</Button>
</div>
```
Save button must never be below the fold.

**Dirty detection:**
```typescript
const initialSnapshot = useMemo(() => JSON.stringify(initialValues), [initialValues]);
const isDirty = useMemo(
  () => JSON.stringify(currentValues) !== initialSnapshot,
  [currentValues, initialSnapshot]
);
```

**`beforeunload` guard:**
```typescript
useEffect(() => {
  if (!isDirty) return;
  const handle = (e: BeforeUnloadEvent) => e.preventDefault();
  window.addEventListener('beforeunload', handle);
  return () => window.removeEventListener('beforeunload', handle);
}, [isDirty]);
```

**Numeric inputs:**
```jsx
<input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" />
```
Never `type="number"` — scroll wheel silently changes values.

**Field labeling:**
```jsx
<div className="space-y-1.5">
  <label htmlFor="fieldId"
    className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
    Field Name
  </label>
  <Input id="fieldId" aria-invalid={!!error} />
  {error && <p className="text-xs text-destructive">{error}</p>}
</div>
```

**Required vs optional**: required → red `*` (`text-destructive`); optional → `(optional)` in `text-foreground/65`.

**Field order = importance.** Required core → required structural → optional.

**Optional/advanced fields collapse by default.** Auto-expand only when pre-filled values exist (edit mode).

**State management:** `useReducer` with discriminated union types for multi-field forms. Reset reducer state when closing dialogs.

---

## List Patterns

**Whole-card link for the primary action:**
```jsx
<Link href={editPath}>
  <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2
    hover:ring-foreground/25 transition-all">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{item.name}</span>
      <button onClick={e => { e.preventDefault(); onDelete(item); }}
        aria-label="Delete item">
        <Trash2 className="size-4" />
      </button>
    </div>
  </div>
</Link>
```

**Hover affordance must be visible.** `ring-foreground/10` → `ring-foreground/25` is sufficient.

**Loading state = Skeleton rows** matching the final card shape. Never a centered "Loading…" string.

**Search input structure:** left search icon + right clear button when value present + right spinner when in-flight. Clear and spinner are mutually exclusive.

**Debounce search:** 300ms `setTimeout`.

**Toast feedback** (`sonner`) for: delete success, save success, network error.

---

## Component Patterns

### Buttons

```
default (h-8):  h-8 gap-1.5 px-2.5
sm (h-7):       h-7 gap-1 px-2.5 text-[0.8rem]
xs (h-6):       h-6 gap-1 px-2 text-xs
icon (h-8):     size-8
icon-sm:        size-7
icon-xs:        size-6
```

**Variants:**
- `default` — indigo primary, hover shadow `shadow-[0_0_16px_rgba(99,102,241,0.25)]`
- `outline` — border + bg-background, hover bg-muted
- `ghost` — no bg, hover bg-muted
- `destructive` — `bg-destructive/10 text-destructive`
- Active state: `active:translate-y-px`
- Expanded state: `aria-expanded:bg-muted`

### Badges & Pills

**Badge:** `inline-flex h-5 items-center rounded-full border px-2 py-0.5 text-xs font-medium`

**MacroPill:**
```typescript
const MACRO_TONES = {
  emerald: 'bg-emerald-500/15 text-emerald-300',  // Protein
  amber:   'bg-amber-500/15 text-amber-300',       // Carbs
  pink:    'bg-pink-500/15 text-pink-300',         // Fat
};
```

### StatCard

```jsx
<div className="rounded-xl ring-1 backdrop-blur-sm p-4 bg-primary/10 ring-primary/20">
  <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
    {label}
  </div>
  <div className="mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums">
    {value}
    <span className="ml-1 text-sm font-medium text-foreground/65">{unit}</span>
  </div>
</div>
```

### Component Pitfalls

**shadcn Card layout:** Card defaults to `flex flex-col`. Use a plain `<div>` with `rounded-xl bg-card ring-1 ring-foreground/10` when horizontal layout is needed.

**Forms in Dialogs/Sheets only.** Never mix form + list on the same page.

---

## Accessibility Minimums

- WCAG AA contrast ≥ 4.5:1 — `text-foreground/65` passes; `text-muted-foreground` does not
- Every icon-only button needs `aria-label`
- Every collapse toggle needs `aria-expanded`
- Form inputs with errors need `aria-invalid={true}`
- Focus rings: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`
- Destructive buttons: `focus-visible:ring-destructive/40`
- Respect `useReducedMotion()` — skip or simplify animations when true

---

---

# Mobile (`mobile/`)

The mobile app must match the web design system as closely as React Native allows. Same dark theme, same color palette, same typography hierarchy, same density principles.

## Theme & Color Tokens

Mobile uses NativeWind with the same token names as web. Because React Native does not support oklch, the `tailwind.config.js` in `mobile/` defines the same tokens as hex equivalents:

| Token | Hex equivalent | Use |
|---|---|---|
| `background` | `#0a0a0a` | Screen background |
| `foreground` | `#ffffff` | Primary text |
| `card` | `#111111` | Card surface |
| `primary` | `#4f46e5` | Indigo brand accent |
| `primary-light` | `#818cf8` | Glow text, badge labels |
| `muted` | `#161616` | Chip bg, pressed states |
| `destructive` | `#ef4444` | Errors, destructive actions |
| `input` | `#1f1f1f` | Input background |

**Same opacity scale as web:** `text-foreground/65`, `text-foreground/40`, etc. work via NativeWind.

**Never hardcode hex colors** in StyleSheet or inline style objects — always use NativeWind token classes.

**Secondary text:** always `text-foreground/65`. Never `text-gray-*` or `text-zinc-*`.

**Semantic accent colors:** same as web — emerald = success, amber = warnings/achievements, pink = Fat macro.

---

## Typography

**Font:** Space Grotesk loaded via `@expo-google-fonts/space-grotesk`. Applied globally — do not set font per-component.

**Size hierarchy (mirrors web):**

| Size | Use |
|---|---|
| 11 | Section labels, field labels (uppercase) |
| 12 | Helper text, subtitles, chip metadata |
| 13 | Body text, empty state descriptions |
| 14 | Card titles, input text |
| 16 | Screen title, primary body |
| 18 | Header title |
| 24 | Stat values |

Same weight/tracking conventions as web: semibold titles, uppercase tracking-wider section labels, tabular-nums stat values.

---

## Animation System

All animation configs live in `mobile/src/lib/animations.ts`. Import from there — never define inline configs.

**Use `react-native-reanimated`** for all animations. Do not use the built-in `Animated` API.

**Spring presets (match web springs):**

```typescript
import { withSpring, withTiming } from 'react-native-reanimated';

export const springs = {
  default: { stiffness: 300, damping: 30 },   // standard transitions
  bouncy:  { stiffness: 400, damping: 18 },   // stat numbers, checkmarks
  snappy:  { stiffness: 600, damping: 35 },   // button press feedback
};

export const timings = {
  fade: { duration: 200 },   // fade in/out
};
```

Screen transitions are handled by React Navigation — do not re-implement per-screen.

Always check `useReducedMotion()` from `react-native-reanimated` and skip or simplify animations when true.

---

## Spacing & Density

Same principles as web — information-dense, horizontal layouts preferred.

| Context | NativeWind classes |
|---|---|
| List item padding | `px-3 py-2` |
| List item gap | `gap-1.5` to `gap-2` — never `gap-4` |
| Section spacing | `gap-6` |
| Screen header padding | `px-4 py-4` |
| Bottom action bar | `px-4 py-3` + safe area inset |

Cards: single row preferred. Use `flex-row items-center justify-between` — name left, secondary info right.

---

## Screen Header Pattern

```tsx
<View className="flex-row items-center justify-between border-b border-foreground/[.06]
  bg-background px-4 py-4">
  <View>
    <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
      {title}
    </Text>
    {subtitle && (
      <Text className="mt-0.5 text-[12px] text-foreground/65">{subtitle}</Text>
    )}
  </View>
  {actions}
</View>
```

---

## Form Patterns

**No `Alert.alert()` for confirmations.** Use a React Native Reusables `<Dialog>` with explicit Cancel + Delete/Discard buttons.

**Sticky bottom action bar:**
```tsx
<View className="border-t border-foreground/10 bg-background/95 px-4 py-3"
  style={{ paddingBottom: insets.bottom || 12 }}>
  <Button variant="ghost">Cancel</Button>
  <Button disabled={!isDirty}>Save</Button>
</View>
```
Use `useSafeAreaInsets()` — never hardcode bottom padding.

**Numeric inputs:**
```tsx
<TextInput keyboardType="decimal-pad" />
```
Never `keyboardType="numeric"` for decimals — it shows no decimal point on some Android keyboards.

**Field labeling:**
```tsx
<View className="gap-1.5">
  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
    Field Name
  </Text>
  <Input aria-invalid={!!error} />
  {error && <Text className="text-xs text-destructive">{error}</Text>}
</View>
```

**Required vs optional**: required → red `*`; optional → `(optional)` in `text-foreground/65`.

---

## Component Patterns

**Use React Native Reusables** for all common components (Button, Dialog, Input, etc.). Do not build custom implementations when a Reusables component exists.

**Touchable elements:** use Reusables `<Button>` or `<Pressable>` with `accessibilityLabel`. Never raw `<TouchableOpacity>` without an accessibility label.

**List items:** `<Pressable>` wrapping a `flex-row items-center justify-between` View. Destructive action is a sibling inside the row, not nested in the primary Pressable.

**Loading state:** Skeleton components matching final card shape. Never a centered "Loading…" text.

---

## Accessibility Minimums

- Every touchable element needs `accessibilityLabel`
- Images need `accessibilityLabel`
- Interactive elements need `accessibilityRole`
- Respect `useReducedMotion()` — skip or simplify animations when true
- Minimum touch target: 44×44pt

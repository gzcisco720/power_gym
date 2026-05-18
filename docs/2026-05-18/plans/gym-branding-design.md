# Gym Branding — Design Spec

## Overview

Allow the owner to upload a gym logo and login background image via the Gym Info settings tab. The logo and gym name appear in the sidebar for all users; the background image appears on the login page.

---

## Section 1: Data Model

Add two fields to `IGymInfo` in `src/lib/db/models/user-profile.model.ts`:

```typescript
export interface IGymInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  logoUrl: string | null;       // circular gym logo
  loginBgUrl: string | null;    // login page full-bleed background
}
```

Mongoose schema: add `logoUrl` and `loginBgUrl` as `{ type: String, default: null, trim: true }` in the `gymInfoSchema`.

The `updateOwnerGymInfoAction` server action accepts and persists both new fields.

---

## Section 2: Upload UI in Gym Info Tab

Add a **"Gym Branding"** section at the top of the Gym Info form (above the Name field).

Layout:
- Two side-by-side upload fields
- **Left — Gym Logo**: circular preview (40×40 or 80×80), fallback is first letter of gym name on `bg-primary` circle. Folder: `"gym-logos"`. Recommended size: 200×200px.
- **Right — Login Background**: `aspect-video` rectangular preview, fallback is a muted placeholder. Folder: `"gym-backgrounds"`. Recommended size: 1920×1080px.

Implementation:
- Reuse existing `uploadFile()` from `src/lib/storage/upload-file.ts` + `getAvatarSignatureAction()` for upload config
- File select → immediate upload → URL stored in local state → saved with form on submit
- Inline in `GymInfoTab` component — no new component needed

---

## Section 3: Sidebar Dynamic Branding

**Data flow:** Dashboard layout server component fetches owner's gymInfo and passes `gymBranding: { name, logoUrl }` as a prop to `AppShell`.

**AppShell changes:**
- New prop: `gymBranding?: { name: string | null; logoUrl: string | null }`
- Replace hardcoded "POWER\nGYM" block with:
  - Circular logo image if `logoUrl` is set, else a circle with the first letter of `name` (or "P" if no name) on `bg-primary`
  - Gym name text (`gymInfo.name` or fallback `"POWER GYM"`)
  - Role label below unchanged

Mobile header: replace hardcoded "POWER GYM" string with dynamic gym name (same fallback).

---

## Section 4: Login Page Dynamic Branding

**Approach:** Convert login page to an async Server Component. Fetch owner's gymInfo directly from the DB (server-side, no auth needed).

**Changes to `src/app/(auth)/login/page.tsx`:**
- Make `Page` async, call a new `getGymBranding()` helper that queries the owner's UserProfile
- Pass `{ name, logoUrl, loginBgUrl }` down to the form area

**Visual changes:**
- If `loginBgUrl` is set: full-bleed background image (`object-cover`) with `bg-black/60` overlay on top
- If no `loginBgUrl`: keep existing `bg-[#030303]` dark background (no change)
- Replace hardcoded "POWER GYM" label with `gymBranding.name ?? "POWER GYM"`
- Add circular logo above the gym name label (same fallback as sidebar)

**`getGymBranding()` helper** (`src/lib/db/queries/gym-branding.ts`):
- Connects to DB, queries `UserProfile` where `userId` matches the owner user
- Returns `{ name, logoUrl, loginBgUrl }` — all nullable
- Called only server-side; never exposed to client

---

## Fallback Rules (all surfaces)

| State | Logo display | Name display | Login bg |
|---|---|---|---|
| Both uploaded | Circular image | `gymInfo.name` | Full-bleed image |
| Logo only | Circular image | `gymInfo.name` or "POWER GYM" | Plain dark bg |
| Name only | First letter circle | `gymInfo.name` | Plain dark bg |
| Nothing uploaded | First letter "P" circle | "POWER GYM" | Plain dark bg |

---

## Out of Scope

- Crop/resize tool for uploads (raw upload only)
- Per-trainer or per-member branding overrides
- Multiple gyms per deployment

# Frontend Vite SPA — Design Spec

**Date**: 2026-05-29
**Sprint**: 2
**Scope**: Migrate web frontend from Next.js App Router to Vite + React SPA in a new `frontend/` directory, connecting exclusively to the NestJS backend. UI/UX stays identical. `web/` remains live during migration and is deleted manually by the user after Sprint 2 acceptance.

---

## Goal

Replace Next.js App Router, Auth.js, and Next.js API Route Handlers with a clean Vite + React SPA that communicates directly with the NestJS backend (Sprint V2-3). All three roles (owner, trainer, member) are fully migrated by the end of Sprint 2.

---

## Tech Stack

| Layer | Choice | Replaces |
|---|---|---|
| Build | Vite 6 + React 19 | Next.js App Router |
| Routing | React Router v7 | Next.js file-system routing |
| State | Zustand v5 | Scattered useState/useEffect + Context |
| UI | Shadcn/ui + TailwindCSS v4 | Same (config updated for Vite) |
| Animation | Framer Motion | Same (variants.ts copied unchanged) |
| Unit tests | Vitest + React Testing Library | Jest |
| E2E | Playwright | Same (specs reused/adapted) |
| Auth | NestJS JWT (access + refresh) | Auth.js (NextAuth v5) |

---

## Directory Structure

```
frontend/
  src/
    api/              ← Thin API layer — one file per NestJS domain module
      client.ts       ← Base fetch wrapper with auth + 401 silent refresh
      auth.ts
      training.ts
      nutrition.ts
      users.ts
      billing.ts
      schedule.ts
      check-ins.ts
      equipment.ts
      member-health.ts
      progress.ts
      account.ts
      storage.ts
    stores/           ← Zustand stores — one file per domain
      authStore.ts
      usersStore.ts
      trainingStore.ts
      nutritionStore.ts
      bodyTestsStore.ts
      scheduleStore.ts
      checkInsStore.ts
      equipmentStore.ts
      memberHealthStore.ts
      progressStore.ts
      billingStore.ts
      accountStore.ts
    router/
      index.tsx       ← createBrowserRouter setup
      guards.tsx      ← RequireAuth + RequireRole components
    pages/
      auth/           ← login, register, forgot-password, reset-password
      owner/          ← mirrors web/(dashboard)/owner/
      trainer/        ← mirrors web/(dashboard)/trainer/
      member/         ← mirrors web/(dashboard)/member/
    components/
      ui/             ← Shadcn primitives (copied from web/src/components/ui/)
      layout/         ← Sidebar, Navbar, PageTransition, DashboardShell
      nutrition/      ← MacroPill and other domain components
    lib/
      animations/     ← variants.ts (copied unchanged from web/)
      utils.ts        ← cn() and other utilities
    hooks/            ← Non-store shared hooks
    types/            ← Shared TypeScript interfaces for API responses
    App.tsx           ← Mounts RouterProvider + calls initAuth on mount
    main.tsx          ← ReactDOM.createRoot entry point
  index.html
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  components.json
  vitest.config.ts
  playwright.config.ts
  package.json
  .env.example
```

---

## Auth Architecture

### Token Storage

| Token | Storage | Why |
|---|---|---|
| Access token (15 min) | JS memory (Zustand store) | Never touches DOM or storage — XSS-safe |
| Refresh token (7 days) | httpOnly Cookie (set by NestJS) | Inaccessible to JS — cannot be stolen |

### App Startup — Silent Refresh

```
App mounts → authStore.initAuth()
  → POST /api/v1/auth/refresh  (browser sends httpOnly cookie automatically)
  → success: store access token in memory, status = 'authenticated'
  → failure: status = 'unauthenticated', router redirects to /login
```

Loading state during `initAuth` shows a full-page spinner — no flash of unauthenticated content.

### Auth Store

```typescript
interface AuthStore {
  user: { id: string; email: string; role: UserRole; name: string } | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

  initAuth(): Promise<void>;         // Called once on App mount
  login(dto: LoginDto): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<string | null>; // Called by API client on 401; returns new token
}
```

### API Client — 401 Handling

```typescript
// src/api/client.ts
async function apiRequest(url, options) {
  const res = await fetch(url, withAuth(options));

  if (res.status === 401) {
    const newToken = await authStore.getState().refresh();
    if (!newToken) { authStore.getState().logout(); throw new Error('Session expired'); }
    return fetch(url, withAuth(options, newToken)); // Retry once with new token
  }
  return res;
}
```

### Login Flow

```
User submits credentials
  → authStore.login({ email, password })
  → POST /api/v1/auth/login
  → backend returns { access_token, user } + Set-Cookie: refresh_token (httpOnly, SameSite=Lax)
  → store: accessToken = token, user = user, status = 'authenticated'
  → navigate to /owner | /trainer | /member based on role
```

### Logout Flow

```
authStore.logout()
  → POST /api/v1/auth/logout  (backend revokes refresh token in DB)
  → backend clears cookie: Set-Cookie: refresh_token=''; Max-Age=0
  → store: accessToken = null, user = null, status = 'unauthenticated'
  → navigate to /login
```

---

## Zustand Store Architecture

All domain stores follow this uniform pattern, eliminating scattered `useState + useEffect` across components:

```typescript
interface DomainStore {
  // State
  data: DomainEntity | DomainEntity[] | null;
  isLoading: boolean;
  error: string | null;

  // Actions — fetch and mutate, all update store state directly
  fetchX(params): Promise<void>;
  createX(dto): Promise<void>;
  updateX(id, dto): Promise<void>;
  deleteX(id): Promise<void>;
  reset(): void;  // Clear store on logout or user switch
}
```

### Domain Store Inventory

| Store | Manages |
|---|---|
| `authStore` | user, accessToken, auth status |
| `usersStore` | members list, trainers list, invites, ownerStats |
| `trainingStore` | activePlan, sessions, activeSession, PBs, exercises, exercise notes |
| `nutritionStore` | memberPlan, templates, foods, dailyLog, selfLog, FatSecret search |
| `bodyTestsStore` | body tests list, CSV export |
| `scheduleStore` | scheduled sessions / member calendar |
| `checkInsStore` | check-ins, check-in config |
| `equipmentStore` | equipment list, condition reports |
| `memberHealthStore` | injuries, medical history, medications |
| `progressStore` | 1RM trend data |
| `billingStore` | service types, member billing lines |
| `accountStore` | user profile, password/email change |

### Component Pattern

Components read from stores and call actions — no local async state:

```typescript
// ✅ After (frontend/)
function SessionPage() {
  const { activeSession, isLoading, updateSet } = useTrainingStore();
  if (isLoading) return <Skeleton />;
  return <SessionView session={activeSession} onUpdateSet={updateSet} />;
}

// ❌ Before (web/) — eliminated
function SessionPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/...').then(r => r.json()).then(setSession).finally(...) }, []);
}
```

---

## Router Architecture

### Route Structure

```typescript
createBrowserRouter([
  // Public auth pages
  { path: '/login',           element: <LoginPage /> },
  { path: '/register',        element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password',  element: <ResetPasswordPage /> },

  // Protected: requires authentication
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <RoleRedirect /> },  // redirects by role

      { element: <RequireRole roles={['owner']} />,
        children: [{ path: '/owner/*', element: <OwnerLayout /> }] },

      { element: <RequireRole roles={['trainer']} />,
        children: [{ path: '/trainer/*', element: <TrainerLayout /> }] },

      { element: <RequireRole roles={['member']} />,
        children: [{ path: '/member/*', element: <MemberLayout /> }] },
    ],
  },
]);
```

### Guard Components

```typescript
function RequireAuth() {
  const status = useAuthStore(s => s.status);
  if (status === 'idle' || status === 'loading') return <FullPageSpinner />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireRole({ roles }: { roles: UserRole[] }) {
  const role = useAuthStore(s => s.user?.role);
  if (!role || !roles.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
```

### URL Parity

All URLs stay identical to `web/` — no redirects required for bookmarked links:

| web/ | frontend/ |
|---|---|
| `/owner/members` | `/owner/members` |
| `/trainer/members/[id]/training` | `/trainer/members/:id/training` |
| `/member/my-training/session/[id]` | `/member/my-training/session/:id` |
| `/member/nutrition/day` | `/member/nutrition/day` |

---

## Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // NestJS backend
        changeOrigin: true,
        credentials: true,               // Forward cookies for refresh token
      },
    },
  },
});
```

---

## NestJS Backend Changes Required

1. **CORS**: Add `http://localhost:5173` to allowed origins with `credentials: true`
2. **Refresh endpoint cookie**: `POST /api/v1/auth/refresh` must `Set-Cookie: refresh_token; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth` — `Path=/api/v1/auth` covers both the refresh and logout endpoints so the browser sends the cookie to both
3. **Logout endpoint**: `POST /api/v1/auth/logout` must read the refresh token from the cookie (not the request body) and revoke it, then clear the cookie with `Max-Age=0`
4. The SPA logout action calls `POST /api/v1/auth/logout` with no body — the browser sends the httpOnly cookie automatically

These are the only source changes required in `backend/`.

---

## Design Tokens & UI Consistency

- `tailwind.config.ts` copied verbatim from `web/` — all `oklch(...)` color tokens identical
- `globals.css` (CSS variables) copied verbatim
- `src/lib/animations/variants.ts` copied verbatim — all Framer Motion springs unchanged
- Shadcn `components/ui/` directory copied verbatim — no component logic changes
- Result: pixel-identical UI, zero design divergence

---

## Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest + RTL | Store actions, API client, guard components |
| E2E | Playwright | Full role flows — reuse/adapt existing web/e2e specs |

Existing `web/e2e/` specs are the template. Each stage of the sprint reuses the corresponding role's E2E spec, adapted for the new base URL (`localhost:5173`).

---

## Sprint 2 Stage Breakdown

### Stage 1 — Scaffold + Auth
**Goal**: `frontend/` project running, auth flow end-to-end working against NestJS backend.

Deliverables:
- Vite project init with all config (tsconfig, tailwind, components.json, vitest, playwright)
- Shadcn/ui + Framer Motion + design tokens wired up
- React Router v7 + `RequireAuth` / `RequireRole` guards
- `authStore` with `initAuth`, `login`, `logout`, `refresh`
- API client with 401 silent refresh
- Auth pages: login, register, forgot-password, reset-password
- NestJS CORS + cookie config

**Acceptance**: Playwright: login → dashboard redirect → refresh page (silent refresh) → logout → redirected to /login

---

### Stage 2 — Owner Domain
**Goal**: All owner pages functional against NestJS.

Stores: `usersStore`, `billingStore`, `scheduleStore`, `equipmentStore`

Pages: dashboard, members list/detail, trainers, invites, billing, calendar, equipment, owner profile/settings

**Acceptance**: Playwright owner flow — create invite, view member list, view billing, manage equipment

---

### Stage 3 — Trainer Domain
**Goal**: All trainer pages functional against NestJS.

Stores: `trainingStore`, `nutritionStore`, `bodyTestsStore`, `memberHealthStore`

Pages: members list, member detail, assign training plan, workout session logging, body tests, nutrition plan, member health

**Acceptance**: Playwright trainer flow — assign plan to member, log session, create body test

---

### Stage 4 — Member Domain
**Goal**: All member pages functional against NestJS.

Stores: `checkInsStore`, `progressStore`, `accountStore` (member-facing slices of training/nutrition stores already built in Stage 3)

Pages: my-training, session logging, nutrition diary, check-in, schedule, body tests, journey, health, billing, settings

**Acceptance**: Playwright member flow — start session → log sets → complete session, submit check-in, log nutrition

---

### Stage 5 — Integration & Verification
**Goal**: Full regression, production build ready, `web/` deletion unblocked.

Deliverables:
- Cross-role journey: owner invites member → member registers → trainer assigns plan → member logs session
- `vite build` passes cleanly
- `pnpm lint` passes
- `pnpm test` (Vitest) passes
- NestJS backend E2E still green

**Acceptance**: Full cross-role Playwright journey passes → user can delete `web/`

---

## Out of Scope

- Any UI/UX changes — pixel parity is required
- Mobile app (React Native) — Sprint V2-5
- Production deployment — Sprint V2-6
- `landing/` (Gatsby) — untouched
- Deleting `web/` — done manually by user after Sprint 2 acceptance

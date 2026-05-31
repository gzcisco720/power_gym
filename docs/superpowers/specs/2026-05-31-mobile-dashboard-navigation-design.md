# Mobile Dashboard & Navigation — Design Spec
Date: 2026-05-31

## Scope

This sprint builds the foundational layout and navigation for the mobile app across all three user roles (Owner, Trainer, Member). All feature screens are placeholder. Settings is fully functional.

---

## 1. Navigation Architecture

### Pattern: Drawer Side Menu

All roles share a hamburger-triggered slide-in drawer. No bottom tab bar.

**Top header (always visible):**
- Left: ☰ hamburger button
- Centre: gym name (from gym branding)

**Drawer (slides in from left, ~78% screen width):**
- Top: gym branding (logo/initial + gym name + "{role} portal")
- Middle: scrollable nav groups with items (see role tables below)
- Bottom: user footer — avatar (initials) + name + role label + ⚙ icon. Tapping anywhere on the footer navigates to Settings.
- Right side: dimmed overlay, tap to close drawer

**Active item:** highlighted with `bg-primary/12 text-primary-light`, matching web sidebar style.

### Role-specific drawer contents

**Owner:**
| Group | Items |
|---|---|
| OVERVIEW | Dashboard |
| PEOPLE | Trainers, Members, Invites |
| GYM | Calendar, Equipment, Services, Billing |
| TEMPLATES | Training Templates, Nutrition Templates |
| PERSONAL | My Training, My Nutrition, My Body Tests |

**Trainer:**
| Group | Items |
|---|---|
| OVERVIEW | Dashboard |
| MEMBERS | Members, Invites |
| SCHEDULE | Calendar, Billing |
| TEMPLATES | Training Templates, Nutrition Templates |
| PERSONAL | My Training, My Nutrition |

**Member:**
| Group | Items |
|---|---|
| OVERVIEW | Dashboard |
| TRAINING | My Training, My Schedule, My Billing |
| HEALTH | My Health, My Nutrition, Body Tests, Check-In, Journey |

### Role determination

On app load (after auth), read `role` from the Zustand auth store. Render the corresponding drawer nav and route the user to their role's Dashboard screen.

---

## 2. Screen Inventory

### Placeholder screens

All placeholder screens show:
- The standard top header (☰ + gym name)
- Page title in the content area
- Empty content — no data fetching, no lists

| Screen | Owner | Trainer | Member |
|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ |
| Trainers | ✓ | — | — |
| Members | ✓ | ✓ | — |
| Invites | ✓ | ✓ | — |
| Calendar | ✓ | ✓ | — |
| Equipment | ✓ | — | — |
| Services | ✓ | — | — |
| Billing | ✓ | ✓ | ✓ |
| Training Templates | ✓ | ✓ | — |
| Nutrition Templates | ✓ | ✓ | — |
| My Training | ✓ | ✓ | ✓ |
| My Nutrition | ✓ | ✓ | — |
| My Body Tests | ✓ | — | — |
| My Schedule | — | — | ✓ |
| My Health | — | — | ✓ |
| Body Tests | — | — | ✓ |
| Check-In | — | — | ✓ |
| Journey | — | — | ✓ |

### Settings screen (fully functional)

Accessible via the drawer user footer. Uses a horizontal tab bar.

**Header:** Settings is a screen pushed onto the navigation stack. Its header shows a back button (←) on the left and "Settings" as the title — not the hamburger.

**Owner — 3 tabs:**

*Profile tab:*
- Avatar (upload photo — JPG/PNG/WebP, max 5MB)
- First Name * / Last Name *
- Email (display only, no change button this sprint)
- Date of Birth
- Mobile (optional)
- Address (optional)
- Certifications (comma-separated)
- Save Profile button

*Security tab:*
- Current Password
- New Password (min 8 chars, 1 uppercase, 1 number)
- Confirm New Password
- Update Password button

*Gym Info tab:*
- Sidebar Logo (upload)
- Login Logo (upload)
- Gym Name
- Address
- Phone
- Email
- Website
- Hours
- Description
- Save Gym Info button

**Trainer — 2 tabs:**

*Profile tab:* Avatar / First Name* / Last Name* / Email (display) / DOB / Mobile / Address / Bio / Specializations (comma-separated) / Certifications (comma-separated) / Save

*Security tab:* Same as Owner.

**Member — 2 tabs:**

*Profile tab:* Avatar / First Name* / Last Name* / Email (display) / DOB / Mobile / Address / Sex (Male/Female) / Fitness Goal (Lose Fat / Build Muscle / Maintain / Improve Performance) / Fitness Level (Beginner / Intermediate / Advanced) / Save

*Security tab:* Same as Owner.

---

## 3. Backend API (new endpoints required)

All endpoints are JWT-protected (access token in Authorization header).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/gym/branding` | Any role | Returns `{ gymName, logoUrl }` — used in top header and drawer branding for all roles |
| GET | `/users/me/profile` | Any role | Returns full profile for the authenticated user |
| PATCH | `/users/me/profile` | Any role | Updates profile fields (name, DOB, mobile, address, role-specific fields) |
| PATCH | `/users/me/password` | Any role | Changes password — requires `currentPassword`, `newPassword` |
| POST | `/users/me/avatar` | Any role | Uploads avatar image, returns `avatarUrl` |
| GET | `/gym/info` | Owner | Returns gym branding + contact info |
| PATCH | `/gym/info` | Owner | Updates gym name, address, phone, email, website, hours, description |
| POST | `/gym/logo` | Owner | Uploads sidebar or login logo, returns `logoUrl` |

**Profile response shape** (all fields returned for every role; non-applicable fields are `null`):
```typescript
interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;           // ISO date string
  mobile: string | null;
  address: string | null;
  // Owner + Trainer
  certifications: string[] | null;
  // Trainer-only
  bio: string | null;
  specializations: string[] | null;
  // Member-only
  sex: 'male' | 'female' | null;
  fitnessGoal: 'lose_fat' | 'build_muscle' | 'maintain' | 'improve_performance' | null;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | null;
}
```

Image uploads: stored in `public/uploads/` (local filesystem, same as web). Backend returns the relative URL.

---

## 4. Data Flow

1. Auth store holds: `userId`, `email`, `role`, `accessToken`, `refreshToken`
2. Settings screen mounts → `GET /users/me/profile` → populate form fields
3. Save → `PATCH /users/me/profile` → update store if name/avatar changed → show success toast
4. Password change → `PATCH /users/me/password` → clear fields on success → show success toast
5. Owner Gym Info → `GET /gym/info` on tab mount → `PATCH /gym/info` on save

---

## 5. Testing

**Unit tests (Jest):**
- Settings form validation (required fields, password rules)
- Role-based tab rendering (Owner gets 3 tabs, Trainer/Member get 2)

**E2E tests (Detox):**
- Golden path: login as Owner → open drawer → navigate to a placeholder screen → open Settings → edit Profile → save → verify name updated
- Golden path: login as Member → verify drawer shows only Member nav items
- Security tab: change password flow

---

## 6. Out of Scope (this sprint)

- Email change flow (requires email verification — future sprint)
- Real content for any placeholder screen
- Push notifications
- Biometrics re-prompt on Settings open

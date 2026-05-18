# Gym Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner upload a gym logo and login background; display both dynamically in the sidebar and login page for all users.

**Architecture:** Add `logoUrl`/`loginBgUrl` to `IGymInfo`; upload inline in GymInfoTab using a new `getGymAssetSignatureAction(folder)` server action (Cloudinary signatures are folder-specific; the avatar action hardcodes `'avatars'` and cannot be reused); pass gym branding down from the dashboard layout's server fetch to `AppShell`; convert the login page to an async Server Component that fetches owner gym branding directly from DB.

**Tech Stack:** Next.js App Router, Mongoose, existing `uploadFile` + `/api/upload` pipeline, React state for upload UX, Tailwind CSS.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/db/models/user-profile.model.ts` | Modify | Add `logoUrl`, `loginBgUrl` to `IGymInfo` interface + `GymInfoSchema` |
| `src/app/(dashboard)/owner/settings/actions.ts` | Modify | Accept + persist `logoUrl`, `loginBgUrl` in `updateGymInfoAction` |
| `src/lib/actions/get-gym-asset-signature.ts` | Create | Server action that generates upload config for gym-specific folders |
| `src/app/(dashboard)/owner/settings/_components/gym-info-tab.tsx` | Modify | Add branding upload section |
| `src/app/(dashboard)/owner/settings/page.tsx` | Modify | Pass `logoUrl`, `loginBgUrl` to `GymInfoTab` |
| `src/lib/db/queries/gym-branding.ts` | Create | Server-side helper — find owner user, return `{ name, logoUrl, loginBgUrl }` |
| `src/app/(dashboard)/layout.tsx` | Modify | Fetch gym branding, pass to `AppShell` |
| `src/components/shared/app-shell.tsx` | Modify | Add `gymBranding` prop; replace hardcoded "POWER GYM" with dynamic content |
| `src/app/(auth)/login/page.tsx` | Modify | Fetch gym branding server-side, apply bg image + dynamic logo/name |

---

## Task 1: Extend IGymInfo data model

**Files:**
- Modify: `src/lib/db/models/user-profile.model.ts`
- Test: `__tests__/lib/db/models/user-profile-gyminfo.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/db/models/user-profile-gyminfo.test.ts
import { UserProfileModel } from '@/lib/db/models/user-profile.model';

describe('GymInfoSchema branding fields', () => {
  it('has logoUrl and loginBgUrl paths with null defaults', () => {
    const gymInfoPaths = (UserProfileModel.schema.path('gymInfo') as any).schema.paths;
    expect(gymInfoPaths).toHaveProperty('logoUrl');
    expect(gymInfoPaths).toHaveProperty('loginBgUrl');
  });

  it('defaults logoUrl and loginBgUrl to null', () => {
    const doc = new UserProfileModel({
      userId: '000000000000000000000001',
      gymInfo: { name: 'Test Gym' },
    });
    expect(doc.gymInfo?.logoUrl).toBeNull();
    expect(doc.gymInfo?.loginBgUrl).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=user-profile-gyminfo
```

Expected: FAIL — `logoUrl` and `loginBgUrl` not in schema.

- [ ] **Step 3: Add fields to the model**

In `src/lib/db/models/user-profile.model.ts`, update `IGymInfo`:

```typescript
export interface IGymInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  logoUrl: string | null;
  loginBgUrl: string | null;
}
```

Update `GymInfoSchema` (add after the `description` line):

```typescript
logoUrl: { type: String, default: null, trim: true },
loginBgUrl: { type: String, default: null, trim: true },
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=user-profile-gyminfo
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/models/user-profile.model.ts __tests__/lib/db/models/user-profile-gyminfo.test.ts
git commit -m "feat(branding): add logoUrl and loginBgUrl to IGymInfo"
```

---

## Task 2: Update updateGymInfoAction to persist branding URLs

**Files:**
- Modify: `src/app/(dashboard)/owner/settings/actions.ts`
- Test: `__tests__/app/owner/update-gym-info-action.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/app/owner/update-gym-info-action.test.ts
import { updateGymInfoAction } from '@/app/(dashboard)/owner/settings/actions';

const mockUpsert = jest.fn().mockResolvedValue({});
jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user1' } }),
}));
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/repositories/user-profile.repository', () => ({
  MongoUserProfileRepository: jest.fn().mockImplementation(() => ({ upsert: mockUpsert })),
}));

describe('updateGymInfoAction', () => {
  it('persists logoUrl and loginBgUrl when provided', async () => {
    const fd = new FormData();
    fd.append('gymName', 'Iron Club');
    fd.append('logoUrl', 'https://cdn.example.com/logo.png');
    fd.append('loginBgUrl', 'https://cdn.example.com/bg.jpg');

    const result = await updateGymInfoAction({ error: '' }, fd);

    expect(result.error).toBe('');
    expect(mockUpsert).toHaveBeenCalledWith(
      'user1',
      expect.objectContaining({
        gymInfo: expect.objectContaining({
          logoUrl: 'https://cdn.example.com/logo.png',
          loginBgUrl: 'https://cdn.example.com/bg.jpg',
        }),
      }),
    );
  });

  it('stores null when branding fields are absent', async () => {
    mockUpsert.mockClear();
    const fd = new FormData();
    fd.append('gymName', 'Iron Club');

    await updateGymInfoAction({ error: '' }, fd);

    expect(mockUpsert).toHaveBeenCalledWith(
      'user1',
      expect.objectContaining({
        gymInfo: expect.objectContaining({ logoUrl: null, loginBgUrl: null }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=update-gym-info-action
```

Expected: FAIL — action doesn't read `logoUrl` / `loginBgUrl` yet.

- [ ] **Step 3: Update the action**

Replace the body of `updateGymInfoAction` in `src/app/(dashboard)/owner/settings/actions.ts`:

```typescript
export async function updateGymInfoAction(
  _prev: GymInfoState,
  formData: FormData,
): Promise<GymInfoState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const name = (formData.get('gymName') as string | null)?.trim() || null;
  const address = (formData.get('gymAddress') as string | null)?.trim() || null;
  const phone = (formData.get('gymPhone') as string | null)?.trim() || null;
  const email = (formData.get('gymEmail') as string | null)?.trim() || null;
  const website = (formData.get('gymWebsite') as string | null)?.trim() || null;
  const hours = (formData.get('gymHours') as string | null)?.trim() || null;
  const description = (formData.get('gymDescription') as string | null)?.trim() || null;
  const logoUrl = (formData.get('logoUrl') as string | null) || null;
  const loginBgUrl = (formData.get('loginBgUrl') as string | null) || null;

  try {
    await connectDB();
    await new MongoUserProfileRepository().upsert(session.user.id, {
      gymInfo: { name, address, phone, email, website, hours, description, logoUrl, loginBgUrl },
    });
    return { error: '' };
  } catch {
    return { error: 'Failed to save gym info' };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=update-gym-info-action
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/owner/settings/actions.ts __tests__/app/owner/update-gym-info-action.test.ts
git commit -m "feat(branding): persist logoUrl and loginBgUrl in updateGymInfoAction"
```

---

## Task 2.5: Create getGymAssetSignatureAction

**Files:**
- Create: `src/lib/actions/get-gym-asset-signature.ts`
- Test: `__tests__/lib/actions/get-gym-asset-signature.test.ts`

The existing `getAvatarSignatureAction` hardcodes `folder = 'avatars'`. Cloudinary's signature includes the folder in the hash, so we cannot override the folder client-side. This action accepts the folder as a parameter.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/actions/get-gym-asset-signature.test.ts
import { getGymAssetSignatureAction } from '@/lib/actions/get-gym-asset-signature';

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user1' } }),
}));

describe('getGymAssetSignatureAction', () => {
  it('returns local config for non-cloudinary provider', async () => {
    delete process.env.UPLOAD_PROVIDER;
    const config = await getGymAssetSignatureAction('gym-logos');
    expect(config.provider).toBe('local');
    expect(config.folder).toBe('gym-logos');
    expect(config.uploadUrl).toBe('/api/upload');
  });

  it('returns config with specified folder', async () => {
    delete process.env.UPLOAD_PROVIDER;
    const config = await getGymAssetSignatureAction('gym-backgrounds');
    expect(config.folder).toBe('gym-backgrounds');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=get-gym-asset-signature
```

Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Create the action**

Create `src/lib/actions/get-gym-asset-signature.ts`:

```typescript
'use server';

import { auth } from '@/lib/auth/auth';
import type { UploadConfig } from '@/lib/storage/types';
import crypto from 'crypto';

export async function getGymAssetSignatureAction(
  folder: 'gym-logos' | 'gym-backgrounds',
): Promise<UploadConfig> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const provider = process.env.UPLOAD_PROVIDER;

  if (provider === 'cloudinary') {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    const apiKey = process.env.CLOUDINARY_API_KEY!;
    const secret = process.env.CLOUDINARY_API_SECRET!;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
      .digest('hex');
    return {
      provider: 'cloudinary',
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      apiKey,
      signature,
      timestamp,
      folder,
      cloudName,
    };
  }

  return { provider: 'local', uploadUrl: '/api/upload', folder };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=get-gym-asset-signature
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/get-gym-asset-signature.ts __tests__/lib/actions/get-gym-asset-signature.test.ts
git commit -m "feat(branding): add getGymAssetSignatureAction for gym-specific upload folders"
```

---

## Task 3: Add branding upload section to GymInfoTab

**Files:**
- Modify: `src/app/(dashboard)/owner/settings/_components/gym-info-tab.tsx`
- Modify: `src/app/(dashboard)/owner/settings/page.tsx`
- Test: `__tests__/app/owner/gym-info-tab-branding.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/app/owner/gym-info-tab-branding.test.tsx
import { render, screen } from '@testing-library/react';
import { GymInfoTab } from '@/app/(dashboard)/owner/settings/_components/gym-info-tab';

jest.mock('@/lib/actions/get-gym-asset-signature', () => ({
  getGymAssetSignatureAction: jest.fn().mockResolvedValue({ provider: 'local', uploadUrl: '/api/upload', folder: 'gym-logos' }),
}));
jest.mock('@/lib/storage/upload-file', () => ({
  uploadFile: jest.fn(),
}));

describe('GymInfoTab branding section', () => {
  it('renders the Logo upload button', () => {
    render(<GymInfoTab gymInfo={null} />);
    expect(screen.getByRole('button', { name: /upload logo/i })).toBeInTheDocument();
  });

  it('renders the Background upload button', () => {
    render(<GymInfoTab gymInfo={null} />);
    expect(screen.getByRole('button', { name: /upload background/i })).toBeInTheDocument();
  });

  it('shows existing logo preview when logoUrl is provided', () => {
    render(
      <GymInfoTab
        gymInfo={{
          name: 'Iron Club', address: null, phone: null, email: null,
          website: null, hours: null, description: null,
          logoUrl: 'https://cdn.example.com/logo.png',
          loginBgUrl: null,
        }}
      />,
    );
    const img = screen.getByAltText('Gym logo');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/logo.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=gym-info-tab-branding
```

Expected: FAIL — component doesn't accept or render branding fields yet.

- [ ] **Step 3: Update GymInfoTab**

Replace the full content of `src/app/(dashboard)/owner/settings/_components/gym-info-tab.tsx`:

```typescript
'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/storage/upload-file';
import { getGymAssetSignatureAction } from '@/lib/actions/get-gym-asset-signature';
import { updateGymInfoAction } from '../actions';

interface GymInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  logoUrl: string | null;
  loginBgUrl: string | null;
}

interface Props {
  gymInfo: GymInfo | null;
}

const GYM_FIELDS: { id: string; label: string; placeholder?: string }[] = [
  { id: 'gymName', label: 'Gym Name' },
  { id: 'gymAddress', label: 'Address' },
  { id: 'gymPhone', label: 'Phone' },
  { id: 'gymEmail', label: 'Email' },
  { id: 'gymWebsite', label: 'Website' },
  { id: 'gymHours', label: 'Hours', placeholder: 'Mon–Fri 6am–10pm' },
];

export function GymInfoTab({ gymInfo }: Props) {
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(gymInfo?.logoUrl ?? null);
  const [loginBgUrl, setLoginBgUrl] = useState<string | null>(gymInfo?.loginBgUrl ?? null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const gymName = gymInfo?.name ?? '';
  const fallbackInitial = gymName.trim().charAt(0).toUpperCase() || 'G';

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const config = await getGymAssetSignatureAction('gym-logos');
      const url = await uploadFile(file, config);
      setLogoUrl(url);
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function handleBgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const config = await getGymAssetSignatureAction('gym-backgrounds');
      const url = await uploadFile(file, config);
      setLoginBgUrl(url);
    } catch {
      toast.error('Failed to upload background');
    } finally {
      setUploadingBg(false);
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  }

  const fieldValues: Record<string, string | null | undefined> = {
    gymName: gymInfo?.name,
    gymAddress: gymInfo?.address,
    gymPhone: gymInfo?.phone,
    gymEmail: gymInfo?.email,
    gymWebsite: gymInfo?.website,
    gymHours: gymInfo?.hours,
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    if (logoUrl) formData.set('logoUrl', logoUrl);
    if (loginBgUrl) formData.set('loginBgUrl', loginBgUrl);
    const result = await updateGymInfoAction({ error: '' }, formData);
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success('Gym info saved');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Branding section */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Gym Branding</p>
        <div className="grid grid-cols-2 gap-4">
          {/* Logo upload */}
          <div className="space-y-2">
            <p className="text-xs text-foreground/65">Logo</p>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              aria-label="Upload logo"
              className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-foreground/10 overflow-hidden bg-muted hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Gym logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[16px] font-semibold text-foreground/60">{fallbackInitial}</span>
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] text-white">uploading...</div>
              )}
            </button>
            <p className="text-[10px] text-foreground/40">200×200px recommended</p>
          </div>

          {/* Background upload */}
          <div className="space-y-2">
            <p className="text-xs text-foreground/65">Login Background</p>
            <button
              type="button"
              onClick={() => bgInputRef.current?.click()}
              disabled={uploadingBg}
              aria-label="Upload background"
              className="relative flex h-16 w-full items-center justify-center rounded-md border border-foreground/10 overflow-hidden bg-muted hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed"
            >
              {loginBgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={loginBgUrl} alt="Login background" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[11px] text-foreground/40">No image</span>
              )}
              {uploadingBg && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] text-white">uploading...</div>
              )}
            </button>
            <p className="text-[10px] text-foreground/40">1920×1080px recommended</p>
          </div>
        </div>
        <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} aria-hidden="true" />
        <input ref={bgInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleBgChange} aria-hidden="true" />
      </div>

      {GYM_FIELDS.map(({ id, label, placeholder }) => (
        <div key={id} className="space-y-1.5">
          <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">{label}</label>
          <Input id={id} name={id} defaultValue={fieldValues[id] ?? ''} placeholder={placeholder} className="bg-card border-foreground/10 text-foreground" />
        </div>
      ))}
      <div className="space-y-1.5">
        <label htmlFor="gymDescription" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Description</label>
        <Textarea id="gymDescription" name="gymDescription" defaultValue={gymInfo?.description ?? ''} rows={3} className="bg-card border-foreground/10 text-foreground" />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving...' : 'Save Gym Info'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Update settings page to pass branding fields**

In `src/app/(dashboard)/owner/settings/page.tsx`, update the `GymInfoTab` call:

```typescript
{tab === 'gym-info' && (
  <GymInfoTab
    gymInfo={
      raw?.gymInfo
        ? {
            name: raw.gymInfo.name ?? null,
            address: raw.gymInfo.address ?? null,
            phone: raw.gymInfo.phone ?? null,
            email: raw.gymInfo.email ?? null,
            website: raw.gymInfo.website ?? null,
            hours: raw.gymInfo.hours ?? null,
            description: raw.gymInfo.description ?? null,
            logoUrl: raw.gymInfo.logoUrl ?? null,
            loginBgUrl: raw.gymInfo.loginBgUrl ?? null,
          }
        : null
    }
  />
)}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- --testPathPattern=gym-info-tab-branding
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/owner/settings/_components/gym-info-tab.tsx src/app/\(dashboard\)/owner/settings/page.tsx __tests__/app/owner/gym-info-tab-branding.test.tsx
git commit -m "feat(branding): add logo and login background upload to GymInfoTab"
```

---

## Task 4: Create getGymBranding helper

**Files:**
- Create: `src/lib/db/queries/gym-branding.ts`
- Test: `__tests__/lib/db/queries/gym-branding.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/db/queries/gym-branding.test.ts
import { getGymBranding } from '@/lib/db/queries/gym-branding';

jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockFindOne = jest.fn();
jest.mock('@/lib/db/models/user.model', () => ({
  UserModel: { findOne: (...args: unknown[]) => mockFindOne(...args) },
}));

const mockProfileFindOne = jest.fn();
jest.mock('@/lib/db/models/user-profile.model', () => ({
  UserProfileModel: { findOne: (...args: unknown[]) => mockProfileFindOne(...args) },
}));

describe('getGymBranding', () => {
  it('returns gymInfo branding fields when owner has a profile', async () => {
    mockFindOne.mockResolvedValue({ _id: 'owner-id' });
    mockProfileFindOne.mockResolvedValue({
      gymInfo: {
        name: 'Iron Club',
        logoUrl: 'https://cdn.example.com/logo.png',
        loginBgUrl: 'https://cdn.example.com/bg.jpg',
      },
    });

    const result = await getGymBranding();

    expect(result).toEqual({
      name: 'Iron Club',
      logoUrl: 'https://cdn.example.com/logo.png',
      loginBgUrl: 'https://cdn.example.com/bg.jpg',
    });
  });

  it('returns null fields when no owner profile exists', async () => {
    mockFindOne.mockResolvedValue(null);

    const result = await getGymBranding();

    expect(result).toEqual({ name: null, logoUrl: null, loginBgUrl: null });
  });

  it('returns null fields when gymInfo is null', async () => {
    mockFindOne.mockResolvedValue({ _id: 'owner-id' });
    mockProfileFindOne.mockResolvedValue({ gymInfo: null });

    const result = await getGymBranding();

    expect(result).toEqual({ name: null, logoUrl: null, loginBgUrl: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=gym-branding
```

Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Create the helper**

Create `src/lib/db/queries/gym-branding.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { UserModel } from '@/lib/db/models/user.model';
import { UserProfileModel } from '@/lib/db/models/user-profile.model';

export interface GymBranding {
  name: string | null;
  logoUrl: string | null;
  loginBgUrl: string | null;
}

export async function getGymBranding(): Promise<GymBranding> {
  await connectDB();
  const owner = await UserModel.findOne({ role: 'owner' }).lean();
  if (!owner) return { name: null, logoUrl: null, loginBgUrl: null };

  const profile = await UserProfileModel.findOne({ userId: owner._id }).lean();
  const gymInfo = profile?.gymInfo;
  return {
    name: gymInfo?.name ?? null,
    logoUrl: gymInfo?.logoUrl ?? null,
    loginBgUrl: gymInfo?.loginBgUrl ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=gym-branding
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/gym-branding.ts __tests__/lib/db/queries/gym-branding.test.ts
git commit -m "feat(branding): add getGymBranding server-side helper"
```

---

## Task 5: Update AppShell to accept and display gym branding

**Files:**
- Modify: `src/components/shared/app-shell.tsx`
- Test: `__tests__/components/shared/app-shell-branding.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/components/shared/app-shell-branding.test.tsx
import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/shared/app-shell';

jest.mock('next/navigation', () => ({ usePathname: () => '/owner', useRouter: () => ({}) }));

const baseProps = {
  role: 'owner' as const,
  userName: 'Jane Smith',
  children: <div />,
};

describe('AppShell gym branding', () => {
  it('shows gymBranding.name in sidebar when provided', () => {
    render(<AppShell {...baseProps} gymBranding={{ name: 'Iron Club', logoUrl: null }} />);
    expect(screen.getAllByText('Iron Club').length).toBeGreaterThan(0);
  });

  it('falls back to POWER GYM when gymBranding is not provided', () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getAllByText(/power gym/i).length).toBeGreaterThan(0);
  });

  it('renders circular logo image when logoUrl is set', () => {
    render(
      <AppShell
        {...baseProps}
        gymBranding={{ name: 'Iron Club', logoUrl: 'https://cdn.example.com/logo.png' }}
      />,
    );
    const img = screen.getAllByAltText('Gym logo')[0];
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/logo.png');
  });

  it('renders initial-letter fallback when logoUrl is null', () => {
    render(<AppShell {...baseProps} gymBranding={{ name: 'Iron Club', logoUrl: null }} />);
    // first letter 'I' rendered in the circle fallback
    expect(screen.getAllByText('I').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=app-shell-branding
```

Expected: FAIL — `gymBranding` prop doesn't exist yet.

- [ ] **Step 3: Update AppShell**

In `src/components/shared/app-shell.tsx`:

1. Add `gymBranding` to `SidebarContentProps`:

```typescript
interface SidebarContentProps {
  role: UserRole;
  userName: string;
  userInitials: string;
  userEmail: string;
  avatarUrl: string | null;
  gymBranding?: { name: string | null; logoUrl: string | null };
  logoutSlot?: React.ReactNode;
}
```

2. Update `SidebarContent` signature to destructure `gymBranding`:

```typescript
function SidebarContent({ role, userName, userInitials, userEmail, avatarUrl, gymBranding, logoutSlot }: SidebarContentProps) {
```

3. Replace the hardcoded brand block (lines 136–145) with:

```typescript
<div className="border-b border-foreground/[.06] px-5 pb-6 pt-6">
  <div className="flex items-center gap-3">
    {gymBranding?.logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={gymBranding.logoUrl}
        alt="Gym logo"
        className="h-9 w-9 shrink-0 rounded-full object-cover border border-foreground/10"
      />
    ) : (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">
        {(gymBranding?.name ?? 'P').trim().charAt(0).toUpperCase()}
      </div>
    )}
    <div className="min-w-0">
      <div className="text-[11px] font-bold tracking-[2px] text-white truncate">
        {gymBranding?.name ?? 'POWER GYM'}
      </div>
      <div className="text-[9px] uppercase tracking-[1px] text-foreground/40">
        {role} portal
      </div>
    </div>
  </div>
</div>
```

4. Add `gymBranding` to `AppShellProps`:

```typescript
interface AppShellProps {
  role: UserRole;
  userName: string;
  userEmail?: string;
  avatarUrl?: string | null;
  gymBranding?: { name: string | null; logoUrl: string | null };
  children: React.ReactNode;
  logoutSlot?: React.ReactNode;
}
```

5. Update `AppShell` to destructure and pass `gymBranding`:

```typescript
export function AppShell({ role, userName, userEmail = '', avatarUrl = null, gymBranding, children, logoutSlot }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userInitials = initials(userName);
  const gymDisplayName = gymBranding?.name ?? 'POWER GYM';

  return (
    <div className="flex h-screen bg-[#030303]">
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-foreground/[.06] bg-[#0a0a0a] lg:flex">
        <SidebarContent role={role} userName={userName} userInitials={userInitials} userEmail={userEmail} avatarUrl={avatarUrl} gymBranding={gymBranding} logoutSlot={logoutSlot} />
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[220px] border-r border-foreground/[.06] bg-[#0a0a0a] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent role={role} userName={userName} userInitials={userInitials} userEmail={userEmail} avatarUrl={avatarUrl} gymBranding={gymBranding} logoutSlot={logoutSlot} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-foreground/[.04] px-4 py-3 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="cursor-pointer text-[#888] hover:text-[#aaa] transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[11px] font-bold tracking-[3px] text-white">{gymDisplayName}</span>
        </div>
        <main className="flex-1 overflow-y-auto bg-[#050505]">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=app-shell-branding
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/app-shell.tsx __tests__/components/shared/app-shell-branding.test.tsx
git commit -m "feat(branding): add gymBranding prop to AppShell sidebar"
```

---

## Task 6: Wire gym branding into dashboard layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

No new test needed — the layout is a thin server component that delegates to already-tested units.

- [ ] **Step 1: Update the dashboard layout**

Replace the full content of `src/app/(dashboard)/layout.tsx`:

```typescript
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getGymBranding } from '@/lib/db/queries/gym-branding';
import { AppShell } from '@/components/shared/app-shell';
import { PageTransition } from '@/components/shared/page-transition';
import { LogoutButton } from '@/components/shared/logout-button';
import type { UserRole } from '@/types/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  await connectDB();
  const [profile, user, gymBranding] = await Promise.all([
    new MongoUserProfileRepository().findByUserId(session.user.id),
    new MongoUserRepository().findById(session.user.id),
    getGymBranding(),
  ]);

  const firstName = user?.firstName ?? session.user.firstName ?? '';
  const lastName = user?.lastName ?? session.user.lastName ?? '';

  return (
    <AppShell
      role={session.user.role as UserRole}
      userName={`${firstName} ${lastName}`.trim() || 'User'}
      userEmail={user?.email ?? session.user.email ?? ''}
      avatarUrl={profile?.avatarUrl ?? null}
      gymBranding={gymBranding}
      logoutSlot={<LogoutButton />}
    >
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
pnpm test
```

Expected: All passing.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx
git commit -m "feat(branding): wire getGymBranding into dashboard layout"
```

---

## Task 7: Update login page with dynamic branding and background

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Test: `__tests__/app/(auth)/login/login-page-branding.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/app/(auth)/login/login-page-branding.test.tsx
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/db/queries/gym-branding', () => ({
  getGymBranding: jest.fn().mockResolvedValue({
    name: 'Iron Club',
    logoUrl: 'https://cdn.example.com/logo.png',
    loginBgUrl: 'https://cdn.example.com/bg.jpg',
  }),
}));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn().mockResolvedValue(null), signIn: jest.fn() }));
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn().mockImplementation(() => ({ findByEmail: jest.fn() })),
}));
jest.mock('@/lib/auth/middleware-helpers', () => ({ ROLE_DEFAULT_PATH: {} }));
jest.mock('@/app/(auth)/login/_components/login-button', () => ({
  LoginButton: () => <button>Sign in</button>,
}));

import LoginPage from '@/app/(auth)/login/page';

describe('LoginPage branding', () => {
  it('displays dynamic gym name from branding', async () => {
    const Page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Page);
    expect(screen.getByText('Iron Club')).toBeInTheDocument();
  });

  it('renders background image element when loginBgUrl is set', async () => {
    const Page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Page);
    const bg = screen.getByTestId('login-bg');
    expect(bg).toBeInTheDocument();
  });

  it('renders gym logo img when logoUrl is set', async () => {
    const Page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Page);
    expect(screen.getByAltText('Gym logo')).toHaveAttribute('src', 'https://cdn.example.com/logo.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=login-page-branding
```

Expected: FAIL — login page doesn't use branding yet.

- [ ] **Step 3: Update login page**

Replace the full content of `src/app/(auth)/login/page.tsx`:

```typescript
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { ROLE_DEFAULT_PATH } from '@/lib/auth/middleware-helpers';
import { getGymBranding } from '@/lib/db/queries/gym-branding';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { LoginButton } from './_components/login-button';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ error, message }, branding] = await Promise.all([
    searchParams,
    getGymBranding(),
  ]);

  const gymName = branding.name ?? 'POWER GYM';
  const fallbackInitial = gymName.trim().charAt(0).toUpperCase();

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      {/* Background */}
      {branding.loginBgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="login-bg"
          src={branding.loginBgUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[#030303]" />
      )}
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Form */}
      <div className="relative z-10 w-full max-w-sm space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt="Gym logo"
                className="h-10 w-10 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-[15px] font-bold text-white">
                {fallbackInitial}
              </div>
            )}
            <div className="text-[11px] font-bold tracking-[3px] text-white">{gymName}</div>
          </div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Sign in</h1>
          <p className="mt-1 text-[13px] text-[#888]">Enter your credentials to continue.</p>
        </div>

        {error === 'CredentialsSignin' && (
          <p className="text-[13px] text-red-400">Invalid email or password.</p>
        )}

        {message === 'password-reset' && (
          <p className="text-[13px] text-green-400">Password reset successfully. Please sign in.</p>
        )}

        <form
          action={async (formData: FormData) => {
            'use server';
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;

            let redirectTo = '/dashboard';
            try {
              await connectDB();
              const repo = new MongoUserRepository();
              const user = await repo.findByEmail(email);
              if (user) redirectTo = ROLE_DEFAULT_PATH[user.role] ?? '/dashboard';
            } catch {
              // fall through
            }

            try {
              await signIn('credentials', { email, password, redirectTo });
            } catch (error) {
              if (error instanceof AuthError) {
                redirect(`/login?error=${error.type}`);
              }
              throw error;
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
            />
          </div>

          <LoginButton />
          <Link
            href="/forgot-password"
            className="block text-center text-[13px] text-[#666] hover:text-[#999]"
          >
            Forgot password?
          </Link>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=login-page-branding
```

Expected: PASS

- [ ] **Step 5: Run full test suite + lint**

```bash
pnpm test && pnpm lint
```

Expected: All passing, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx __tests__/app/\(auth\)/login/login-page-branding.test.tsx
git commit -m "feat(branding): dynamic gym name, logo, and background on login page"
```

---

## Task 8: Manual smoke test

- [ ] **Start the dev server**

```bash
pnpm dev
```

- [ ] **Verify GymInfoTab upload**

1. Log in as owner → Settings → Gym Info tab
2. Confirm the "Gym Branding" section appears at the top with logo circle and background rectangle
3. Upload a logo image → confirm it appears in the circle
4. Upload a background image → confirm it appears in the rectangle
5. Click "Save Gym Info" → confirm success toast

- [ ] **Verify sidebar branding**

1. After saving, reload any dashboard page
2. Confirm the sidebar top-left shows the uploaded circular logo + gym name
3. Log in as trainer or member → confirm they also see the logo + name

- [ ] **Verify login page**

1. Log out → confirm the login page shows the background image with overlay
2. Confirm logo and gym name appear above the form

- [ ] **Final build check**

```bash
pnpm build
```

Expected: Clean build with no errors.

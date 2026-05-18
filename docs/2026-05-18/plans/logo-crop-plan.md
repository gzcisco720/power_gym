# Logo Crop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 1:1 crop dialog to the gym logo upload flow — owner picks a file, crops it in a modal, and the cropped WebP blob is uploaded.

**Architecture:** Three new units: `cropImageToBlob` (pure canvas utility), `LogoCropDialog` (crop UI component wrapping `react-easy-crop` in a shadcn Dialog), and an update to `GymInfoTab` to intercept file selection, open the dialog, and upload the cropped result. The existing `getGymAssetSignatureAction` + `uploadFile` upload pipeline is unchanged.

**Tech Stack:** `react-easy-crop`, HTML5 Canvas API, shadcn Dialog, React state.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/image/crop-image.ts` | Create | Pure async function: loads image, draws crop area to canvas, returns WebP Blob |
| `src/components/settings/logo-crop-dialog.tsx` | Create | Dialog with `react-easy-crop` + live circle preview canvas + Apply/Cancel |
| `src/app/(dashboard)/owner/settings/_components/gym-info-tab.tsx` | Modify | Intercept logo file selection → open crop dialog; upload cropped blob |

---

## Task 1: Install react-easy-crop

**Files:** `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install the package**

```bash
cd /Users/eric_gong/Projects/power_gym
pnpm add react-easy-crop
```

Expected output: `dependencies: + react-easy-crop ...`

- [ ] **Step 2: Verify TypeScript types are included**

```bash
node -e "require('react-easy-crop')" && echo "ok"
```

Expected: `ok` (the package ships its own types)

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(logo-crop): install react-easy-crop"
```

---

## Task 2: Create cropImageToBlob utility

**Files:**
- Create: `src/lib/image/crop-image.ts`
- Test: `__tests__/lib/image/crop-image.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/image/crop-image.test.ts

const mockDrawImage = jest.fn();
const mockGetContext = jest.fn().mockReturnValue({ drawImage: mockDrawImage });

beforeAll(() => {
  // @ts-expect-error — jsdom canvas stub
  HTMLCanvasElement.prototype.getContext = mockGetContext;

  Object.defineProperty(global, 'Image', {
    value: class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_url: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    },
    writable: true,
    configurable: true,
  });
});

beforeEach(() => {
  mockDrawImage.mockClear();
  mockGetContext.mockClear();
  jest
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['px'], { type: 'image/webp' }));
    });
});

import { cropImageToBlob } from '@/lib/image/crop-image';

describe('cropImageToBlob', () => {
  it('returns a Blob', async () => {
    const blob = await cropImageToBlob('data:image/png;base64,abc', {
      x: 0, y: 0, width: 100, height: 100,
    });
    expect(blob).toBeInstanceOf(Blob);
  });

  it('draws the image with negated crop origin', async () => {
    await cropImageToBlob('data:image/png;base64,abc', {
      x: 20, y: 30, width: 100, height: 100,
    });
    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), -20, -30);
  });

  it('calls toBlob with webp format at 0.9 quality', async () => {
    const toBlobSpy = jest.spyOn(HTMLCanvasElement.prototype, 'toBlob');
    await cropImageToBlob('data:image/png;base64,abc', {
      x: 0, y: 0, width: 80, height: 80,
    });
    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.9);
  });

  it('rejects when toBlob returns null', async () => {
    jest
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementationOnce((callback: BlobCallback) => {
        callback(null);
      });
    await expect(
      cropImageToBlob('data:image/png;base64,abc', { x: 0, y: 0, width: 50, height: 50 }),
    ).rejects.toThrow('Canvas toBlob returned null');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=crop-image
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the utility**

Create `src/lib/image/crop-image.ts`:

```typescript
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropImageToBlob(imageSrc: string, cropArea: CropArea): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, -cropArea.x, -cropArea.y);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null'));
            return;
          }
          resolve(blob);
        },
        'image/webp',
        0.9,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=crop-image
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/image/crop-image.ts __tests__/lib/image/crop-image.test.ts
git commit -m "feat(logo-crop): add cropImageToBlob canvas utility"
```

---

## Task 3: Create LogoCropDialog component

**Files:**
- Create: `src/components/settings/logo-crop-dialog.tsx`
- Test: `__tests__/components/settings/logo-crop-dialog.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/components/settings/logo-crop-dialog.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/lib/image/crop-image', () => ({
  cropImageToBlob: jest.fn().mockResolvedValue(new Blob(['crop'], { type: 'image/webp' })),
}));

jest.mock('react-easy-crop', () => ({
  __esModule: true,
  default: ({
    onCropComplete,
  }: {
    onCropComplete: (
      a: { x: number; y: number; width: number; height: number },
      b: { x: number; y: number; width: number; height: number },
    ) => void;
  }) => (
    <button
      data-testid="mock-cropper"
      onClick={() =>
        onCropComplete(
          { x: 0, y: 0, width: 100, height: 100 },
          { x: 10, y: 10, width: 200, height: 200 },
        )
      }
    />
  ),
}));

import { LogoCropDialog } from '@/components/settings/logo-crop-dialog';

describe('LogoCropDialog', () => {
  it('renders the dialog title', () => {
    render(
      <LogoCropDialog
        open
        imageSrc="data:image/png;base64,abc"
        onApply={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getByText('Crop Logo')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = jest.fn();
    render(
      <LogoCropDialog
        open
        imageSrc="data:image/png;base64,abc"
        onApply={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onApply with a Blob when Apply is clicked after crop', async () => {
    const onApply = jest.fn();
    render(
      <LogoCropDialog
        open
        imageSrc="data:image/png;base64,abc"
        onApply={onApply}
        onCancel={jest.fn()}
      />,
    );
    // Trigger onCropComplete via mock cropper
    fireEvent.click(screen.getByTestId('mock-cropper'));
    // Click Apply
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    // Wait for async cropImageToBlob
    await screen.findByRole('button', { name: /apply/i });
    expect(onApply).toHaveBeenCalledWith(expect.any(Blob));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=logo-crop-dialog
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `src/components/settings/logo-crop-dialog.tsx`:

```typescript
'use client';

import { useState, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cropImageToBlob } from '@/lib/image/crop-image';

interface Props {
  open: boolean;
  imageSrc: string;
  onApply: (blob: Blob) => void;
  onCancel: () => void;
}

export function LogoCropDialog({ open, imageSrc, onApply, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  function handleCropComplete(_croppedArea: Area, pixelArea: Area) {
    setCroppedAreaPixels(pixelArea);
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pixelArea.x, pixelArea.y, pixelArea.width, pixelArea.height, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageSrc;
  }

  async function handleApply() {
    if (!croppedAreaPixels) return;
    setApplying(true);
    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels);
      onApply(blob);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-foreground/[.06]">
          <DialogTitle>Crop Logo</DialogTitle>
        </DialogHeader>
        <div className="relative h-64 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>
        <DialogFooter className="px-4 py-3 border-t border-foreground/[.06] flex items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <canvas
              ref={previewCanvasRef}
              width={40}
              height={40}
              className="rounded-full border border-foreground/10 bg-muted"
            />
            <span className="text-xs text-foreground/40">Preview</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-foreground/65"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!croppedAreaPixels || applying}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {applying ? 'Applying...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=logo-crop-dialog
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/logo-crop-dialog.tsx __tests__/components/settings/logo-crop-dialog.test.tsx
git commit -m "feat(logo-crop): add LogoCropDialog component"
```

---

## Task 4: Wire crop into GymInfoTab

**Files:**
- Modify: `src/app/(dashboard)/owner/settings/_components/gym-info-tab.tsx`
- Modify: `__tests__/app/owner/gym-info-tab-branding.test.tsx`

- [ ] **Step 1: Add a new failing test to the existing test file**

Open `__tests__/app/owner/gym-info-tab-branding.test.tsx` and add these mock + test at the top/bottom:

At the top, add to the existing mock section:

```typescript
jest.mock('@/components/settings/logo-crop-dialog', () => ({
  LogoCropDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="logo-crop-dialog">crop</div> : null,
}));

// Add URL mock setup
beforeEach(() => {
  global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake-object-url');
  global.URL.revokeObjectURL = jest.fn();
});
```

Add new test at the end of the existing `describe` block:

```typescript
it('shows crop dialog after a logo file is selected', () => {
  render(<GymInfoTab gymInfo={null} />);

  // Find the logo file input (first hidden file input)
  const inputs = document.querySelectorAll('input[type="file"]');
  const logoInput = inputs[0] as HTMLInputElement;

  const file = new File(['content'], 'logo.png', { type: 'image/png' });
  Object.defineProperty(logoInput, 'files', { value: [file], configurable: true });
  fireEvent.change(logoInput);

  expect(screen.getByTestId('logo-crop-dialog')).toBeInTheDocument();
});
```

You'll also need to add `fireEvent` to the import:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=gym-info-tab-branding
```

Expected: FAIL on the new test — crop dialog is not shown yet.

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
import { LogoCropDialog } from '@/components/settings/logo-crop-dialog';
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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const gymName = gymInfo?.name ?? '';
  const fallbackInitial = gymName.trim().charAt(0).toUpperCase() || 'G';

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  async function handleCropApply(blob: Blob) {
    if (!cropSrc) return;
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setUploadingLogo(true);
    try {
      const config = await getGymAssetSignatureAction('gym-logos');
      const file = new File([blob], 'logo.webp', { type: 'image/webp' });
      const url = await uploadFile(file, config);
      setLogoUrl(url);
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
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
    <>
      {cropSrc !== null && (
        <LogoCropDialog
          open
          imageSrc={cropSrc}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      )}
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
    </>
  );
}
```

- [ ] **Step 4: Run all tests**

```bash
pnpm test -- --testPathPattern=gym-info-tab-branding
```

Expected: PASS (all 4 tests, including the new crop dialog test)

- [ ] **Step 5: Run full suite + lint**

```bash
pnpm test && pnpm lint
```

Expected: All passing, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/owner/settings/_components/gym-info-tab.tsx __tests__/app/owner/gym-info-tab-branding.test.tsx
git commit -m "feat(logo-crop): wire LogoCropDialog into GymInfoTab logo upload"
```

---

## Task 5: Manual smoke test

- [ ] **Start dev server**

```bash
pnpm dev
```

- [ ] **Verify crop flow**

1. Log in as owner → Settings → Gym Info
2. Click the circular logo button
3. Select any JPG/PNG image from your system
4. Confirm the crop dialog opens with the image and a circular crop overlay
5. Drag to reposition the crop area
6. Verify the circle preview in the bottom-left updates
7. Click **Apply** → dialog closes → uploading overlay shows on the logo button
8. Confirm the cropped image appears in the circular preview
9. Click **Save Gym Info** → confirm the logo appears in the sidebar

- [ ] **Verify Cancel**

1. Click the logo button again → select a file → crop dialog opens
2. Click **Cancel** → dialog closes, previous logo unchanged

- [ ] **Final build check**

```bash
pnpm build
```

Expected: Clean build.

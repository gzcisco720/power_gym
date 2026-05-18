# Logo Crop — Design Spec

## Overview

Add a 1:1 crop step to the gym logo upload flow. After the owner selects a file, a Dialog opens with a crop UI powered by `react-easy-crop`. The owner positions the circular crop area, clicks Apply, and the cropped pixels are rendered to a canvas Blob before being uploaded via the existing pipeline.

---

## Flow

1. Owner clicks the circular logo button in **Gym Info → Gym Branding**
2. File picker opens (existing hidden `<input>`)
3. Owner selects an image
4. **New:** `handleLogoChange` reads the file, calls `URL.createObjectURL`, sets `cropSrc` state — no upload yet
5. `LogoCropDialog` renders (triggered by `cropSrc !== null`)
6. Owner drags/pinches to position the 1:1 circular crop area
7. Owner clicks **Apply** → `cropImageToBlob` renders the crop to a WebP Blob
8. `Object.revokeObjectURL(cropSrc)` cleans up memory
9. Blob uploaded via existing `getGymAssetSignatureAction('gym-logos')` + `uploadFile`
10. URL set in state; Dialog closes
11. Owner clicks **Cancel** → Dialog closes, `cropSrc` cleared, no upload

---

## New Files

### `src/components/settings/logo-crop-dialog.tsx`

Client Component. Props:

```typescript
interface Props {
  imageSrc: string;
  onApply: (blob: Blob) => void;
  onCancel: () => void;
}
```

Internals:
- Shadcn `<Dialog>` (always open while mounted; parent controls mount)
- `react-easy-crop` filling the dialog body: `aspect={1}`, `cropShape="round"`, `showGrid={false}`
- `onCropComplete` stores `croppedAreaPixels`
- Bottom row: circular 40px `<canvas>` preview (updated on each `onCropComplete`) + "Preview" label + Cancel + Apply buttons
- Apply: calls `cropImageToBlob(imageSrc, croppedAreaPixels)` → passes Blob to `onApply`

### `src/lib/image/crop-image.ts`

Pure utility, no React dependency:

```typescript
export async function cropImageToBlob(
  imageSrc: string,
  cropArea: { x: number; y: number; width: number; height: number },
): Promise<Blob>
```

Implementation:
1. Load `imageSrc` into an `HTMLImageElement`
2. Create `<canvas>` sized `cropArea.width × cropArea.height`
3. `ctx.drawImage(img, -cropArea.x, -cropArea.y)`
4. `canvas.toBlob('image/webp', 0.9)` → resolve

---

## Modified Files

### `src/app/(dashboard)/owner/settings/_components/gym-info-tab.tsx`

Changes:
- Add `cropSrc: string | null` state
- `handleLogoChange`: read file → `URL.createObjectURL` → `setCropSrc` (no upload)
- Render `<LogoCropDialog>` when `cropSrc !== null`
- `onApply(blob)`: `revokeObjectURL(cropSrc)`, `setCropSrc(null)`, then upload blob via existing pipeline
- `onCancel`: `revokeObjectURL(cropSrc)`, `setCropSrc(null)`, reset file input

---

## Dependencies

- `react-easy-crop` — install via `pnpm add react-easy-crop`

---

## Out of Scope

- Crop for the login background image (free-form crop makes less sense for a full-bleed background)
- Zoom slider UI (pinch/scroll is sufficient for now)
- Server-side image processing

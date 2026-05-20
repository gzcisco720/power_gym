# Check-ins & Photos Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Check-ins tab with trend charts and load-more pagination, and add a new Photos tab with an iPhone-style photo comparison feature.

**Architecture:** Six sequential tasks. Tasks 1–2 are data/nav plumbing (no UI). Tasks 3–5 build the three new UI sections (Photos client, trend charts, load-more history). Task 6 wires the Check-ins page. Body fat is NOT shown in the comparison popup because it is not stored on the check-in model — only weight is available per check-in.

**Tech Stack:** Next.js App Router (Server + Client Components), Recharts (already installed), Tailwind CSS, `@/lib/repositories/check-in.repository.ts`

---

## File Map

| Action | File |
|---|---|
| Modify | `src/lib/repositories/check-in.repository.ts` |
| Modify | `__tests__/lib/repositories/check-in.repository.test.ts` |
| Modify | `src/components/shared/member-tab-nav.tsx` |
| Create | `src/app/(dashboard)/trainer/members/[id]/photos/page.tsx` |
| Create | `src/app/(dashboard)/trainer/members/[id]/photos/_components/photos-client.tsx` |
| Create | `src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-trends.tsx` |
| Modify | `src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-list.tsx` |
| Modify | `src/app/(dashboard)/trainer/members/[id]/check-ins/page.tsx` |

---

## Task 1: Update `findPhotosForMember` — add weight, filter to photos-only

**Files:**
- Modify: `src/lib/repositories/check-in.repository.ts`
- Modify: `__tests__/lib/repositories/check-in.repository.test.ts`

### Step 1: Update the interface and implementation

In `src/lib/repositories/check-in.repository.ts`, replace the `findPhotosForMember` signature and implementation:

```ts
// Interface — update return type
findPhotosForMember(memberId: string): Promise<{
  _id: string;
  submittedAt: Date;
  photos: string[];
  weight: number | null;
}[]>;

// Implementation — filter to photo-having check-ins, add weight + _id
async findPhotosForMember(memberId: string): Promise<{
  _id: string;
  submittedAt: Date;
  photos: string[];
  weight: number | null;
}[]> {
  const docs = await CheckInModel.find(
    {
      memberId: new mongoose.Types.ObjectId(memberId),
      'photos.0': { $exists: true }, // only check-ins with ≥1 photo
    },
    { submittedAt: 1, photos: 1, weight: 1 },
  ).sort({ submittedAt: 1 }).lean();

  return docs.map((d) => ({
    _id: String(d._id),
    submittedAt: d.submittedAt as Date,
    photos: d.photos as string[],
    weight: (d.weight as number | null | undefined) ?? null,
  }));
}
```

### Step 2: Write failing tests

In `__tests__/lib/repositories/check-in.repository.test.ts`, add a new `describe('findPhotosForMember')` block. The existing file mocks `CheckInModel.find`. Add after the existing tests:

```ts
describe('findPhotosForMember', () => {
  it('returns only check-ins that have photos, with _id, submittedAt, photos, weight', async () => {
    const submittedAt = new Date('2026-05-01');
    const mockDocs = [
      { _id: { toString: () => 'ci1' }, submittedAt, photos: ['url1', 'url2'], weight: 78 },
    ];
    const leanMock = jest.fn().mockResolvedValue(mockDocs);
    const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
    mockModel.find.mockReturnValue({ sort: sortMock } as never);

    const result = await repo.findPhotosForMember(memberId);

    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ 'photos.0': { $exists: true } }),
      expect.objectContaining({ photos: 1, weight: 1 }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      _id: 'ci1',
      submittedAt,
      photos: ['url1', 'url2'],
      weight: 78,
    });
  });

  it('maps weight to null when undefined', async () => {
    const mockDocs = [
      { _id: { toString: () => 'ci2' }, submittedAt: new Date(), photos: ['url1'], weight: undefined },
    ];
    const leanMock = jest.fn().mockResolvedValue(mockDocs);
    const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
    mockModel.find.mockReturnValue({ sort: sortMock } as never);

    const result = await repo.findPhotosForMember(memberId);

    expect(result[0].weight).toBeNull();
  });
});
```

### Step 3: Run tests

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm test __tests__/lib/repositories/check-in.repository.test.ts
```

Expected: new tests pass. Run lint: `pnpm lint` — no errors.

### Step 4: Commit

```bash
git add src/lib/repositories/check-in.repository.ts \
        __tests__/lib/repositories/check-in.repository.test.ts
git commit -m "feat(check-in): findPhotosForMember returns weight, filters to photos-only"
```

---

## Task 2: Add Photos tab to member-tab-nav

**Files:**
- Modify: `src/components/shared/member-tab-nav.tsx`

### Step 1: Add Photos tab entry

```ts
const TABS = [
  { label: 'Overview', segment: '' },
  { label: 'Plan', segment: '/plan' },
  { label: 'Body Tests', segment: '/body-tests' },
  { label: 'Nutrition', segment: '/nutrition' },
  { label: 'Health', segment: '/health' },
  { label: 'Check-ins', segment: '/check-ins' },
  { label: 'Photos', segment: '/photos' },
] as const;
```

### Step 2: Lint

```bash
pnpm lint
```

### Step 3: Commit

```bash
git add src/components/shared/member-tab-nav.tsx
git commit -m "feat(member-hub): add Photos tab to nav"
```

---

## Task 3: Create Photos page and client component

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/photos/page.tsx`
- Create: `src/app/(dashboard)/trainer/members/[id]/photos/_components/photos-client.tsx`

### Step 1: Create `photos/page.tsx`

```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PhotosClient } from './_components/photos-client';

export default async function TrainerMemberPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const raw = await new MongoCheckInRepository().findPhotosForMember(memberId);

  // Flatten: one PhotoItem per photo URL, preserving check-in metadata
  const photoItems = raw.flatMap((ci) =>
    ci.photos.map((url, idx) => ({
      key: `${ci._id}-${idx}`,
      photoUrl: url,
      submittedAt: ci.submittedAt.toISOString(),
      weight: ci.weight,
    })),
  );

  return <PhotosClient photos={photoItems} />;
}
```

### Step 2: Create `photos/_components/photos-client.tsx`

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PhotoItem {
  key: string;
  photoUrl: string;
  submittedAt: string;
  weight: number | null;
}

interface Props {
  photos: PhotoItem[];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function PhotosClient({ photos }: Props) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<PhotoItem[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  function enterSelect() {
    setSelectMode(true);
    setSelected([]);
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected([]);
    setCompareOpen(false);
  }

  function togglePhoto(photo: PhotoItem) {
    if (!selectMode) return;
    const idx = selected.findIndex((s) => s.key === photo.key);
    if (idx !== -1) {
      setSelected((prev) => prev.filter((s) => s.key !== photo.key));
    } else if (selected.length < 2) {
      setSelected((prev) => [...prev, photo]);
    }
  }

  function badgeFor(photo: PhotoItem): number | null {
    const idx = selected.findIndex((s) => s.key === photo.key);
    return idx === -1 ? null : idx + 1;
  }

  // Sort selected by date: left = older, right = newer
  const [compareLeft, compareRight] = [...selected].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );

  if (photos.length === 0) {
    return (
      <div className="px-4 sm:px-8 py-7">
        <p className="text-sm text-foreground/40">No photos submitted in any check-in yet.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-7 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {selectMode ? (
          <>
            <span className="text-[13px] text-primary-light font-medium">
              {selected.length === 0 ? 'Tap to select photos' : `${selected.length} of 2 selected`}
            </span>
            <button
              type="button"
              onClick={exitSelect}
              className="text-[12px] text-foreground/45 hover:text-foreground/70 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-[12px] text-foreground/40">{photos.length} photos</span>
            <button
              type="button"
              onClick={enterSelect}
              className="bg-primary/12 border border-primary/25 text-primary-light rounded-lg px-3 py-1.5 text-[12px] font-semibold hover:bg-primary/20 transition-colors"
            >
              Select
            </button>
          </>
        )}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-4 gap-2">
        {photos.map((photo) => {
          const badge = badgeFor(photo);
          const isSelected = badge !== null;
          const isDimmed = selectMode && selected.length === 2 && !isSelected;

          return (
            <button
              key={photo.key}
              type="button"
              onClick={() => togglePhoto(photo)}
              className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                isSelected
                  ? 'border-primary'
                  : selectMode
                    ? 'border-transparent'
                    : 'border-transparent hover:border-foreground/20'
              } ${isDimmed ? 'opacity-35' : 'opacity-100'} ${!selectMode ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <Image
                src={photo.photoUrl}
                alt={`Check-in photo ${formatDate(photo.submittedAt)}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 25vw, 20vw"
              />
              {/* Date label */}
              <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent">
                <span className="text-[9px] text-white/80">{formatDate(photo.submittedAt)}</span>
              </div>
              {/* Selection badge */}
              {isSelected && (
                <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                  {badge}
                </div>
              )}
              {/* Empty circle in select mode (unselected) */}
              {selectMode && !isSelected && !isDimmed && (
                <div className="absolute top-1.5 left-1.5 w-5 h-5 border-2 border-white/50 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Compare bar */}
      {selectMode && selected.length === 2 && (
        <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex items-center justify-between mt-4">
          <span className="text-[12px] text-foreground/50">
            {formatDate(compareLeft!.submittedAt)} · {formatDate(compareRight!.submittedAt)}
          </span>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="bg-primary text-white rounded-lg px-5 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Compare Photos
          </button>
        </div>
      )}

      {/* Compare popup */}
      {compareOpen && compareLeft && compareRight && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCompareOpen(false); }}
        >
          <div className="bg-card border border-foreground/10 rounded-2xl p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[15px] font-bold text-foreground">Photo Comparison</span>
              <button
                type="button"
                onClick={() => setCompareOpen(false)}
                className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Close comparison"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[compareLeft, compareRight].map((photo) => (
                <div key={photo.key}>
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3">
                    <Image
                      src={photo.photoUrl}
                      alt={`Check-in ${formatDate(photo.submittedAt)}`}
                      fill
                      className="object-cover"
                      sizes="40vw"
                    />
                  </div>
                  <div className="text-[11px] text-foreground/40 mb-2">{formatDate(photo.submittedAt)}</div>
                  {photo.weight !== null ? (
                    <div>
                      <div className="text-[18px] font-bold text-foreground leading-none">
                        {photo.weight}
                        <span className="text-[11px] font-medium text-foreground/40 ml-1">kg</span>
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-foreground/30 mt-0.5">Weight</div>
                    </div>
                  ) : (
                    <div className="text-[12px] text-foreground/30">No weight recorded</div>
                  )}
                </div>
              ))}
            </div>

            {/* Delta row */}
            {compareLeft.weight !== null && compareRight.weight !== null && (
              <div className="mt-4 pt-4 border-t border-foreground/8 flex items-center gap-4">
                {(() => {
                  const delta = compareRight.weight - compareLeft.weight;
                  const isDown = delta < 0;
                  return (
                    <>
                      <span className={`text-[13px] font-medium ${isDown ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isDown ? '▼' : '▲'} {Math.abs(delta).toFixed(1)} kg
                      </span>
                      <span className="text-[11px] text-foreground/30 ml-auto">
                        {Math.abs(
                          Math.round((new Date(compareRight.submittedAt).getTime() - new Date(compareLeft.submittedAt).getTime()) / (1000 * 60 * 60 * 24 * 7))
                        )} weeks apart
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 3: Run lint

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm lint
```

Expected: no errors.

### Step 4: Visual check

Dev server runs on `http://localhost:3000`. Log in as `trainer@dev.com` / `Dev123!` and navigate to `http://localhost:3000/trainer/members/6a096af17825c9a7cf7a5165/photos`.

Verify:
1. "Photos" tab is active
2. Grid of check-in photos appears (or "No photos" message if none in dev data)
3. "Select" button appears top-right
4. Clicking Select → enters select mode, shows empty circles on photos
5. Clicking a photo → gets blue border + "1" badge
6. Clicking another → "2" badge, others dim
7. "Compare Photos" bar appears at bottom
8. Clicking "Compare Photos" → popup opens with 2 photos, weight below each, delta row
9. Left photo is the earlier date, right is the later date
10. Clicking outside popup → closes it

### Step 5: Commit

```bash
git add \
  "src/app/(dashboard)/trainer/members/[id]/photos/page.tsx" \
  "src/app/(dashboard)/trainer/members/[id]/photos/_components/photos-client.tsx"
git commit -m "feat(photos): add Photos tab with select mode and side-by-side photo comparison"
```

---

## Task 4: Create `CheckInTrends` component — wellness score + diet compliance

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-trends.tsx`

Two charts, no new data fetching — all data from `checkIns` prop already available on the page.

- **Left**: Avg wellness score line chart (Recharts `LineChart`)
- **Right**: Diet compliance dot strip (plain divs, no Recharts needed)

### Step 1: Create the component

```tsx
'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import type { ICheckIn } from '@/lib/db/models/check-in.model';

interface Props {
  checkIns: ICheckIn[];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatShortDate(d: Date | string): string {
  const date = new Date(d);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

const DIET_COLOR: Record<string, string> = {
  yes: 'bg-emerald-500',
  partial: 'bg-amber-500',
  no: 'bg-rose-500',
};
const DIET_LABEL: Record<string, string> = {
  yes: 'Stuck to diet',
  partial: 'Partial',
  no: 'Off track',
};

export function CheckInTrends({ checkIns }: Props) {
  if (checkIns.length === 0) return null;

  // Wellness score: last 12 check-ins, oldest→newest for L→R display
  const scoreData = [...checkIns]
    .slice(0, 12)
    .reverse()
    .map((ci) => ({
      date: formatShortDate(ci.submittedAt),
      avg: parseFloat(
        ((ci.sleepQuality + ci.energy + ci.recovery + ci.stress + ci.fatigue + ci.hunger + ci.digestion) / 7).toFixed(1),
      ),
    }));

  // Diet compliance: last 16 check-ins, oldest→newest
  const complianceData = [...checkIns].slice(0, 16).reverse();

  return (
    <div className="px-4 sm:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Wellness score */}
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/65 mb-3">
            Avg Wellness Score
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height={144}>
              <LineChart data={scoreData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: 'currentColor' }}
                  className="text-foreground/50"
                  stroke="currentColor"
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fontSize: 9, fill: 'currentColor' }}
                  className="text-foreground/50"
                  stroke="currentColor"
                  width={20}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(value) => [`${value}/10`, 'Avg score']}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="rgb(99 102 241)"
                  strokeWidth={2}
                  dot={{ fill: 'rgb(99 102 241)', r: 2.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diet compliance */}
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/65 mb-3">
            Diet Compliance
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {complianceData.map((ci, i) => (
              <div
                key={i}
                title={`${formatShortDate(ci.submittedAt)}: ${DIET_LABEL[ci.stuckToDiet]}`}
                className={`w-5 h-5 rounded-sm ${DIET_COLOR[ci.stuckToDiet] ?? 'bg-muted'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-[10px] text-foreground/50">Stuck</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-500" />
              <span className="text-[10px] text-foreground/50">Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-rose-500" />
              <span className="text-[10px] text-foreground/50">Off track</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Run lint

```bash
pnpm lint
```

### Step 3: Commit

```bash
git add "src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-trends.tsx"
git commit -m "feat(check-ins): add CheckInTrends component — wellness score chart and diet compliance dots"
```

---

## Task 5: Add load-more pagination to `CheckInList`

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-list.tsx`

Client-side slice — no new API calls. Initial display: 10. Each load: +10.

### Step 1: Add `useState` import and `visibleCount` state

Add `useState` to the existing `import { useState } from 'react'` (it's not imported yet — the component is currently not a client component). We need to convert it to `'use client'` (it already is — check the top of the file) and add state.

The current file already has `'use client'` at the top. Confirm that, then modify the component:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/components/shared/section-header';
import type { ICheckIn } from '@/lib/db/models/check-in.model';

interface Props {
  memberId: string;
  checkIns: ICheckIn[];
}

function formatDate(val: string | Date) {
  return new Date(val).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const DIET_LABEL: Record<string, string> = {
  yes: 'Stuck',
  no: 'Off track',
  partial: 'Partial',
};

const DIET_COLOR: Record<string, string> = {
  yes: 'text-emerald-400',
  no: 'text-rose-400',
  partial: 'text-amber-400',
};

export function CheckInList({ memberId, checkIns }: Props) {
  const [visibleCount, setVisibleCount] = useState(10);
  const visible = checkIns.slice(0, visibleCount);
  const hasMore = checkIns.length > visibleCount;

  return (
    <section className="px-4 sm:px-8">
      <SectionHeader title={`Check-In History${checkIns.length ? ` (${checkIns.length})` : ''}`} />
      {checkIns.length === 0 ? (
        <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-4">
          <p className="text-sm text-foreground/65">No check-ins submitted yet.</p>
        </div>
      ) : (
        <>
          <ul className="mt-3 space-y-1.5">
            {visible.map((ci) => {
              const id = String((ci as ICheckIn & { _id: unknown })._id);
              const avgRating = Math.round(
                (ci.sleepQuality + ci.energy + ci.recovery + ci.stress + ci.fatigue + ci.hunger + ci.digestion) / 7,
              );
              return (
                <li key={id}>
                  <Link
                    href={`/trainer/members/${memberId}/check-ins/${id}`}
                    className="block rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 hover:ring-foreground/25 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-sm font-semibold text-foreground">
                        {formatDate(ci.submittedAt)}
                      </span>
                      <div className="ml-auto flex items-center gap-3 text-xs text-foreground/65 tabular-nums">
                        <span>
                          Avg <strong className="text-foreground">{avgRating}</strong>/10
                        </span>
                        {ci.weight !== null && ci.weight !== undefined && (
                          <>
                            <span className="text-foreground/40">·</span>
                            <span><strong className="text-foreground">{ci.weight}</strong> kg</span>
                          </>
                        )}
                        <span className="text-foreground/40">·</span>
                        <span className={DIET_COLOR[ci.stuckToDiet] ?? 'text-foreground/65'}>
                          {DIET_LABEL[ci.stuckToDiet]}
                        </span>
                        {ci.photos?.length > 0 && (
                          <>
                            <span className="text-foreground/40">·</span>
                            <span>{ci.photos.length} 📷</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + 10)}
              className="mt-3 w-full rounded-xl border border-foreground/10 py-2.5 text-sm text-foreground/50 hover:text-foreground/75 hover:border-foreground/20 transition-colors"
            >
              Show {Math.min(10, checkIns.length - visibleCount)} more
            </button>
          )}
        </>
      )}
    </section>
  );
}
```

### Step 2: Run lint

```bash
pnpm lint
```

### Step 3: Commit

```bash
git add "src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-list.tsx"
git commit -m "feat(check-ins): add load-more pagination to check-in history (10 per batch)"
```

---

## Task 6: Wire `CheckInTrends` into the Check-ins page

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/check-ins/page.tsx`

### Step 1: Update the page

```tsx
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { CheckInScheduleForm } from './_components/check-in-schedule-form';
import { CheckInList } from './_components/check-in-list';
import { CheckInTrends } from './_components/check-in-trends';
import type { ICheckInConfig } from '@/lib/db/models/check-in-config.model';
import type { ICheckIn } from '@/lib/db/models/check-in.model';

export default async function TrainerMemberCheckInsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: memberId } = await params;

  await connectDB();
  const [rawConfig, rawCheckIns] = await Promise.all([
    new MongoCheckInConfigRepository().findByMember(memberId),
    new MongoCheckInRepository().findByMember(memberId),
  ]);

  const config = rawConfig
    ? (JSON.parse(JSON.stringify(rawConfig)) as ICheckInConfig)
    : null;
  const checkIns = JSON.parse(JSON.stringify(rawCheckIns)) as ICheckIn[];

  return (
    <div className="space-y-8 py-6">
      <CheckInScheduleForm memberId={memberId} initialConfig={config} />
      {checkIns.length >= 2 && <CheckInTrends checkIns={checkIns} />}
      <CheckInList memberId={memberId} checkIns={checkIns} />
    </div>
  );
}
```

Note: `CheckInTrends` is only shown when there are ≥2 check-ins (a line chart with 1 point is meaningless).

### Step 2: Run lint + full test suite

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm lint && pnpm test __tests__/lib/repositories/check-in.repository.test.ts
```

### Step 3: Visual check

Navigate to `http://localhost:3000/trainer/members/6a096af17825c9a7cf7a5165/check-ins`.

Verify:
1. "Weekly Reminder" section at top (unchanged)
2. Two trend charts below it: "Avg Wellness Score" line chart + "Diet Compliance" dot grid
3. "Check-In History (26)" section with 10 rows visible
4. "Show 10 more" button at bottom
5. Clicking loads 10 more; repeating until all 26 visible
6. "Stuck" shows emerald, "Off track" shows rose, "Partial" shows amber
7. Navigate to Photos tab — grid of photos appears

### Step 4: Commit

```bash
git add "src/app/(dashboard)/trainer/members/[id]/check-ins/page.tsx"
git commit -m "feat(check-ins): wire CheckInTrends into page, show only when ≥2 check-ins"
```

---

## Self-Review

**Spec coverage:**
- ✅ Weekly Reminder preserved — Task 6 keeps `CheckInScheduleForm` in page
- ✅ Avg wellness score chart — Task 4 `CheckInTrends` left panel, Recharts LineChart
- ✅ Diet compliance chart — Task 4 right panel, colored dot strip
- ✅ No chart duplication: wellness score and diet compliance are unique to Check-ins; weight/BF trend lives in Overview + Body Tests
- ✅ Load more history — Task 5, shows 10 initially, +10 per click
- ✅ Photos tab in nav — Task 2
- ✅ 4-column photo grid — Task 3 `photos-client.tsx`
- ✅ Select mode with 1/2 badges — Task 3
- ✅ Unselected photos dim when 2 are chosen — Task 3 `isDimmed` logic
- ✅ Compare button appears after 2 selected — Task 3
- ✅ Comparison sorted left=older right=newer — Task 3 `[...selected].sort()`
- ✅ Weight below each comparison photo — Task 3
- ✅ Delta weight row — Task 3
- ✅ Body fat NOT shown (not in check-in model) — documented above
- ✅ Diet status color-coded in history rows — Task 5

**Placeholder scan:** None found.

**Type consistency:**
- `PhotoItem.submittedAt` is `string` (ISO) throughout — Tasks 1, 3 both use ISO strings
- `ICheckIn` from `@/lib/db/models/check-in.model` used in Tasks 4, 5, 6 consistently
- `findPhotosForMember` return type defined in Task 1 and consumed in Task 3's `page.tsx`

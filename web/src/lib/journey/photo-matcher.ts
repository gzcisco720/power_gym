export interface CheckInPhotoEntry {
  submittedAt: Date;
  photos: string[];
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function getCheckInsNearDate(
  testDate: Date,
  checkIns: CheckInPhotoEntry[],
): CheckInPhotoEntry[] {
  return checkIns
    .filter(
      (c) =>
        c.photos.length > 0 &&
        Math.abs(c.submittedAt.getTime() - testDate.getTime()) <= FOURTEEN_DAYS_MS,
    )
    .sort(
      (a, b) =>
        Math.abs(a.submittedAt.getTime() - testDate.getTime()) -
        Math.abs(b.submittedAt.getTime() - testDate.getTime()),
    );
}

export function findNearestPhoto(
  testDate: Date,
  checkIns: CheckInPhotoEntry[],
): string | null {
  const candidates = getCheckInsNearDate(testDate, checkIns);
  return candidates[0]?.photos[0] ?? null;
}

export function findPhotosNear(
  testDate: Date,
  checkIns: CheckInPhotoEntry[],
  max: number,
): string[] {
  const candidates = getCheckInsNearDate(testDate, checkIns);
  const photos: string[] = candidates.flatMap((c) => c.photos);
  return photos.slice(0, max);
}

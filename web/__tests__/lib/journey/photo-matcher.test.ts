import { findNearestPhoto, findPhotosNear, type CheckInPhotoEntry } from '@/lib/journey/photo-matcher';

const testDate = new Date('2024-03-01');

describe('findNearestPhoto', () => {
  it('returns null when no check-ins', () => {
    expect(findNearestPhoto(testDate, [])).toBeNull();
  });

  it('returns null when all check-ins are outside ±14 days', () => {
    const checkIns: CheckInPhotoEntry[] = [
      { submittedAt: new Date('2024-01-10'), photos: ['a.jpg'] },
      { submittedAt: new Date('2024-04-20'), photos: ['b.jpg'] },
    ];
    expect(findNearestPhoto(testDate, checkIns)).toBeNull();
  });

  it('returns null when check-in within window has no photos', () => {
    const checkIns: CheckInPhotoEntry[] = [
      { submittedAt: new Date('2024-03-05'), photos: [] },
    ];
    expect(findNearestPhoto(testDate, checkIns)).toBeNull();
  });

  it('returns the first photo of the nearest check-in within ±14 days', () => {
    const checkIns: CheckInPhotoEntry[] = [
      { submittedAt: new Date('2024-03-03'), photos: ['near.jpg', 'near2.jpg'] },
      { submittedAt: new Date('2024-03-08'), photos: ['far.jpg'] },
    ];
    expect(findNearestPhoto(testDate, checkIns)).toBe('near.jpg');
  });

  it('returns the closest photo when multiple candidates exist', () => {
    const checkIns: CheckInPhotoEntry[] = [
      { submittedAt: new Date('2024-02-20'), photos: ['behind.jpg'] }, // 10 days before
      { submittedAt: new Date('2024-03-04'), photos: ['ahead.jpg'] },  // 3 days after
    ];
    expect(findNearestPhoto(testDate, checkIns)).toBe('ahead.jpg');
  });
});

describe('findPhotosNear', () => {
  it('returns empty array when no check-ins with photos in window', () => {
    expect(findPhotosNear(testDate, [], 3)).toEqual([]);
  });

  it('returns up to max photos ordered by proximity', () => {
    const checkIns: CheckInPhotoEntry[] = [
      { submittedAt: new Date('2024-03-10'), photos: ['c.jpg'] }, // 9 days after
      { submittedAt: new Date('2024-03-02'), photos: ['a.jpg'] }, // 1 day after
      { submittedAt: new Date('2024-02-28'), photos: ['b.jpg'] }, // 2 days before
    ];
    const result = findPhotosNear(testDate, checkIns, 3);
    expect(result).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('respects max limit', () => {
    const checkIns: CheckInPhotoEntry[] = Array.from({ length: 5 }, (_, i) => ({
      submittedAt: new Date(testDate.getTime() + i * 24 * 60 * 60 * 1000),
      photos: [`photo${i}.jpg`],
    }));
    expect(findPhotosNear(testDate, checkIns, 3)).toHaveLength(3);
  });
});

import { searchCatalog } from './equipment-catalog';

describe('searchCatalog', () => {
  it('returns empty array for queries under 2 chars', () => {
    expect(searchCatalog('')).toEqual([]);
    expect(searchCatalog('a')).toEqual([]);
  });

  it('returns up to 8 case-insensitive substring matches', () => {
    // "Treadmill" and "Curved Treadmill" both contain "tread"
    const results = searchCatalog('tread');
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.length).toBeLessThanOrEqual(8);
    results.forEach((name) => {
      expect(name.toLowerCase()).toContain('tread');
    });
  });

  it('is case-insensitive', () => {
    const lower = searchCatalog('bike');
    const upper = searchCatalog('BIKE');
    expect(lower).toEqual(upper);
  });

  it('returns at most 8 results', () => {
    // "machine" or "bar" should match many items
    const results = searchCatalog('bar');
    expect(results.length).toBeLessThanOrEqual(8);
  });

  it('returns empty array when no matches found', () => {
    const results = searchCatalog('zzzznotfound');
    expect(results).toEqual([]);
  });
});

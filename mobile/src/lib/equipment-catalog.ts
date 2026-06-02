import catalogData from '../../assets/data/gym_equipment.json';

const CATALOG_NAMES: string[] = (catalogData as { equipment: { id: string; name: string }[] }).equipment.map(
  (item) => item.name,
);

export function searchCatalog(query: string, limit = 8): string[] {
  if (query.length < 2) return [];
  const lower = query.toLowerCase();
  const results: string[] = [];
  for (const name of CATALOG_NAMES) {
    if (name.toLowerCase().includes(lower)) {
      results.push(name);
      if (results.length >= limit) break;
    }
  }
  return results;
}

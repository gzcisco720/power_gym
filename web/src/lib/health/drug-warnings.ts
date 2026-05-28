const WARNINGS: [string, string][] = [
  ['metoprolol', 'Beta blocker — use RPE instead of HR to set intensity'],
  ['atenolol', 'Beta blocker — use RPE instead of HR to set intensity'],
  ['bisoprolol', 'Beta blocker — use RPE instead of HR to set intensity'],
  ['propranolol', 'Beta blocker — use RPE instead of HR to set intensity'],
  ['warfarin', 'Blood thinner — avoid contact sports; check supplement interactions'],
  ['ibuprofen', 'NSAID — may mask pain signals; monitor effort carefully'],
  ['naproxen', 'NSAID — may mask pain signals'],
  ['aspirin', 'Blood thinner — monitor for bleeding risk'],
  ['simvastatin', 'Statin — monitor for unusual muscle soreness'],
  ['atorvastatin', 'Statin — monitor for unusual muscle soreness'],
  ['rosuvastatin', 'Statin — monitor for unusual muscle soreness'],
  ['furosemide', 'Diuretic — dehydration risk; monitor hydration'],
  ['hydrochlorothiazide', 'Diuretic — dehydration risk'],
  ['insulin', 'Insulin — monitor for hypoglycemia during exercise'],
  ['metformin', 'Diabetes medication — monitor blood glucose'],
  ['prednisone', 'Corticosteroid — monitor bone density; avoid high-impact loading'],
  ['prednisolone', 'Corticosteroid — monitor bone density'],
];

export function getDrugWarning(medicationName: string): string | null {
  const lower = medicationName.toLowerCase();
  for (const [keyword, warning] of WARNINGS) {
    if (lower.includes(keyword)) return warning;
  }
  return null;
}

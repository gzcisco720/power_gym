export interface BodyTestRecord {
  _id: string;
  date: string;
  protocol: '3site' | '7site' | '9site' | 'other';
  weight: number;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
}

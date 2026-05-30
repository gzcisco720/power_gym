interface BodySnap { weight: number; bodyFatPct: number }
interface PbSnap { exerciseName: string; estimatedOneRM: number; achievedAt: Date }

interface KpiInputs {
  sessionsThisMonth: number;
  latest: BodySnap | null;
  previous: BodySnap | null;
  topPb: PbSnap | null;
  now: Date;
}

interface KpiData {
  sessionsThisMonth: number;
  weightKg: string;
  weightDelta: number | null;
  weightImproved: boolean;
  bfPct: string;
  bfDelta: number | null;
  bfImproved: boolean;
  topPrName: string;
  topPrKg: string;
  isNewPr: boolean;
}

export function buildKpiData({ sessionsThisMonth, latest, previous, topPb, now }: KpiInputs): KpiData {
  const weightDelta =
    latest && previous ? parseFloat((latest.weight - previous.weight).toFixed(1)) : null;
  const bfDelta =
    latest && previous ? parseFloat((latest.bodyFatPct - previous.bodyFatPct).toFixed(1)) : null;

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const isNewPr = topPb ? new Date(topPb.achievedAt) > sevenDaysAgo : false;

  return {
    sessionsThisMonth,
    weightKg: latest ? latest.weight.toFixed(1) : '—',
    weightDelta,
    // Dashboard assumes weight loss = improvement; this may need revisiting for members in a bulk phase
    weightImproved: weightDelta !== null && weightDelta < 0,
    bfPct: latest ? latest.bodyFatPct.toFixed(1) : '—',
    bfDelta,
    bfImproved: bfDelta !== null && bfDelta < 0,
    topPrName: topPb ? topPb.exerciseName : 'Top PR',
    topPrKg: topPb ? topPb.estimatedOneRM.toFixed(1) : '—',
    isNewPr,
  };
}

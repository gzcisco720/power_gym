export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function addOneHour(time: string): string {
  const totalMin = timeToMinutes(time) + 60;
  const hh = Math.min(Math.floor(totalMin / 60), 23);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

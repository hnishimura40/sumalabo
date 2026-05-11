export function formatNumber(value: number): string {
  return value.toLocaleString('ja-JP');
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatPosition(value: number): string {
  return value.toFixed(1);
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

export interface DeltaInfo {
  ratio: number;
  label: string;
  tone: 'up' | 'down' | 'flat';
}

export function calcDelta(current: number, previous: number): DeltaInfo {
  if (!previous) {
    return { ratio: 0, label: '—', tone: 'flat' };
  }
  const ratio = (current - previous) / previous;
  const tone: DeltaInfo['tone'] = ratio > 0.005 ? 'up' : ratio < -0.005 ? 'down' : 'flat';
  const sign = ratio > 0 ? '+' : '';
  return {
    ratio,
    label: `${sign}${(ratio * 100).toFixed(1)}%`,
    tone,
  };
}

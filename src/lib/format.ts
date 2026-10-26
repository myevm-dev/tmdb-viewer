export const shortAddress = (a?: string | null) =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';

export function usd(
  n: number | null | undefined,
  opts: { compact?: boolean } = {},
) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (opts.compact !== false && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(n);
  }
  if (Math.abs(n) > 0 && Math.abs(n) < 0.01) {
    // Tiny token prices: show significant digits instead of $0.00
    return `$${n.toPrecision(3)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

export function pct(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function compact(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n);
}

export function timeAgo(iso?: string | number | null) {
  if (!iso) return '';
  const t = typeof iso === 'number' ? iso : Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, 'y'],
    [60 * 60 * 24 * 30, 'mo'],
    [60 * 60 * 24, 'd'],
    [60 * 60, 'h'],
    [60, 'm'],
  ];
  for (const [sec, label] of units)
    if (s >= sec) return `${Math.floor(s / sec)}${label} ago`;
  return `${s}s ago`;
}

/** "The Dark Knight" -> "DARKKNIGHT" style ticker, max 10 chars. */
export function suggestSymbol(title: string) {
  const words = title
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['THE', 'A', 'AN', 'OF', 'AND'].includes(w));
  if (!words.length) return 'FAN';
  const joined = words.join('');
  if (joined.length <= 8) return joined;
  if (words.length > 1)
    return (
      words
        .map((w) => w[0])
        .join('')
        .slice(0, 6) || joined.slice(0, 8)
    );
  return joined.slice(0, 8);
}

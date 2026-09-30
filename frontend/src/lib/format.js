// Single source of truth for how money, counts and percentages are printed.
// Every page reads from here so the app can never disagree with itself about
// what a number means.

const CURRENCY = '$';

/** Compact money for headline figures: $1.2K, $3.4M, $1.1B. */
export function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const n = Math.abs(value);
  if (n >= 1e9) return `${sign}${CURRENCY}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sign}${CURRENCY}${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${sign}${CURRENCY}${(n / 1e3).toFixed(1)}K`;
  return `${sign}${CURRENCY}${n.toFixed(2)}`;
}

/** Exact money, grouped, for tables and tooltips where the precise figure matters. */
export function formatCurrencyExact(value) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value < 0 ? '-' : '';
  return `${sign}${CURRENCY}${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Money for axis ticks. Drops the cents so a run of ticks reads as one scale
 * rather than mixing "$750.00" with "$1.5K".
 */
export function formatCurrencyAxis(value) {
  if (value == null || Number.isNaN(value)) return '';
  const sign = value < 0 ? '-' : '';
  const n = Math.abs(value);
  if (n >= 1e9) return `${sign}${CURRENCY}${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${sign}${CURRENCY}${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${sign}${CURRENCY}${(n / 1e3).toFixed(1)}K`;
  return `${sign}${CURRENCY}${Math.round(n)}`;
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString();
}

export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

/** Signed percentage for change indicators: +12.4%, -3.1%. */
export function formatSignedPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

/**
 * The palette's categorical series, in the order the dataviz validator passed.
 * Use SERIES for bars, lines and stacked areas. Use SERIES_SAFE for scatter and
 * bubble, which are held to the stricter all-pairs test — past three series,
 * fold the remainder into "Other" rather than reaching for a fourth colour.
 */
export const SERIES = ['#1d63b5', '#b4531c', '#7b3b63', '#8a7414', '#5b5bc4'];
export const SERIES_SAFE = SERIES.slice(0, 3);

export const CHART_INK = {
  grid: '#dcd8cc',
  axis: '#b3a68c',
  label: '#6b6055',
  surface: '#f4f2ec',
  loss: '#a52910',
  warn: '#8a7414',
};

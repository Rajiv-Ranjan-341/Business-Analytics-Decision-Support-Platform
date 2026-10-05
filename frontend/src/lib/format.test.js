import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatCurrencyAxis,
  formatCurrencyExact,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  SERIES,
  SERIES_SAFE,
} from './format';

// Every page prints its numbers through this module, so a change here changes
// what the whole app claims. These tests pin the two things that matter: the
// shape of a figure that exists, and what is printed in place of one that does
// not.
//
// The compact and percentage formatters build their output with toFixed, so
// their results are the same on any machine and are asserted exactly. The two
// that call toLocaleString are not — grouping and the decimal mark follow the
// host locale — so those are asserted on the parts that hold everywhere.

describe('formatCurrency', () => {
  it('prints plain money under a thousand to the cent', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(85.31)).toBe('$85.31');
    expect(formatCurrency(999.99)).toBe('$999.99');
  });

  it('compacts at each threshold', () => {
    expect(formatCurrency(1000)).toBe('$1.0K');
    expect(formatCurrency(21870.58)).toBe('$21.9K');
    expect(formatCurrency(2_297_200.86)).toBe('$2.30M');
    expect(formatCurrency(1.5e9)).toBe('$1.50B');
  });

  it('carries the sign outside the currency mark', () => {
    expect(formatCurrency(-383.03)).toBe('-$383.03');
    expect(formatCurrency(-8879.97)).toBe('-$8.9K');
  });

  it('prints an em dash when there is no figure', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency(NaN)).toBe('—');
  });
});

describe('formatCurrencyExact', () => {
  it('keeps two decimal places', () => {
    expect(formatCurrencyExact(1234.5)).toMatch(/^\$1.234.50$/);
    expect(formatCurrencyExact(0)).toMatch(/^\$0.00$/);
  });

  it('carries the sign outside the currency mark', () => {
    expect(formatCurrencyExact(-1811.08)).toMatch(/^-\$1.811.08$/);
  });

  it('prints an em dash when there is no figure', () => {
    expect(formatCurrencyExact(null)).toBe('—');
    expect(formatCurrencyExact(undefined)).toBe('—');
    expect(formatCurrencyExact(NaN)).toBe('—');
  });
});

describe('formatCurrencyAxis', () => {
  it('drops the cents so a run of ticks reads as one scale', () => {
    expect(formatCurrencyAxis(750)).toBe('$750');
    expect(formatCurrencyAxis(1500)).toBe('$1.5K');
    expect(formatCurrencyAxis(2_300_000)).toBe('$2.3M');
  });

  // An axis tick is a label on a chart, not a sentence. An em dash floating
  // beside an axis would read as a value, so a missing one prints nothing.
  it('prints nothing at all when there is no figure', () => {
    expect(formatCurrencyAxis(null)).toBe('');
    expect(formatCurrencyAxis(undefined)).toBe('');
    expect(formatCurrencyAxis(NaN)).toBe('');
  });
});

describe('formatNumber', () => {
  it('groups counts', () => {
    expect(formatNumber(9994)).toMatch(/^9.994$/);
    expect(formatNumber(0)).toBe('0');
  });

  it('prints an em dash when there is no figure', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber(NaN)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('prints one decimal place by default', () => {
    expect(formatPercent(40.9)).toBe('40.9%');
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(-8.0)).toBe('-8.0%');
  });

  it('honours a requested precision', () => {
    expect(formatPercent(27.1234, 2)).toBe('27.12%');
    expect(formatPercent(27.1234, 0)).toBe('27%');
  });

  // This is the guard that makes an unmeasured forecast safe to print. The
  // backend now reports a null MAPE for a model it could not score, and this
  // is what that null becomes on screen.
  it('prints an em dash for an unmeasured figure, not a zero', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
    expect(formatPercent(NaN)).toBe('—');
    expect(formatPercent(0)).not.toBe('—');
  });
});

describe('formatSignedPercent', () => {
  it('always shows the direction', () => {
    expect(formatSignedPercent(12.4)).toBe('+12.4%');
    expect(formatSignedPercent(-3.1)).toBe('-3.1%');
  });

  it('treats no change as a rise rather than dropping the sign', () => {
    expect(formatSignedPercent(0)).toBe('+0.0%');
  });

  it('prints an em dash when there is no figure', () => {
    expect(formatSignedPercent(null)).toBe('—');
    expect(formatSignedPercent(undefined)).toBe('—');
    expect(formatSignedPercent(NaN)).toBe('—');
  });
});

describe('the chart palette', () => {
  it('offers five series for bars and lines', () => {
    expect(SERIES).toHaveLength(5);
    SERIES.forEach((hex) => expect(hex).toMatch(/^#[0-9a-f]{6}$/));
  });

  // Scatter and bubble are held to the stricter all-pairs contrast test, so the
  // safe set is deliberately shorter and must stay a prefix of the full one.
  it('holds scatter to the first three', () => {
    expect(SERIES_SAFE).toHaveLength(3);
    expect(SERIES_SAFE).toEqual(SERIES.slice(0, 3));
  });

  it('has no duplicate colours', () => {
    expect(new Set(SERIES).size).toBe(SERIES.length);
  });
});

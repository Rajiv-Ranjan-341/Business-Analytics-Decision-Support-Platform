import { formatCurrency, formatNumber, formatPercent } from '../../lib/format';
import { useTicker } from '../../lib/motion';

// Module level so each formatter's identity is stable — the ticker keys its
// animation on it, and a new function every render would restart the count.
const FORMATTERS = {
  currency: (v) => formatCurrency(v),
  percent: (v) => formatPercent(v),
  number: (v) => formatNumber(Math.round(v)),
};

/**
 * A figure that counts to its value when the data lands, the way a till does.
 * The running number is written straight to the node, so this does not
 * re-render while it moves, and it lands on the exact value rather than near it.
 * Under reduced motion it simply prints the value.
 */
export default function Figure({ value, format = 'number', className }) {
  const fn = FORMATTERS[format] || FORMATTERS.number;
  const ref = useTicker(value, fn);
  return (
    <span ref={ref} className={className}>
      {fn(value)}
    </span>
  );
}

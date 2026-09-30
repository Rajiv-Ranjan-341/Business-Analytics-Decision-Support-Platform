import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatSignedPercent } from '../../lib/format';
import Figure from '../Shared/Figure';

const CARD_CONFIG = [
  { key: 'total_revenue', label: 'Sold', format: 'currency', growth: 'revenue_growth_pct' },
  { key: 'total_profit', label: 'Kept', format: 'currency', growth: 'profit_growth_pct' },
  { key: 'profit_margin', label: 'Margin', format: 'percent' },
  { key: 'total_orders', label: 'Orders', format: 'number' },
  { key: 'unique_customers', label: 'Customers', format: 'number' },
  { key: 'avg_order_value', label: 'Average order', format: 'currency' },
  { key: 'total_units_sold', label: 'Units sold', format: 'number' },
  { key: 'avg_discount', label: 'Average discount', format: 'percent' },
];

export default function KPICards({ kpis }) {
  const cards = CARD_CONFIG.filter((c) => kpis[c.key] != null);

  return (
    <div className="paper-feed mb-8 grid grid-cols-2 gap-px border border-kraft bg-kraft md:grid-cols-4">
      {cards.map(({ key, label, format, growth }) => (
        <div key={key} className="bg-sheet px-4 py-4">
          <p className="text-sm text-ink/70">{label}</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">
            <Figure value={kpis[key]} format={format} />
          </p>
          {growth && kpis[growth] != null && <Change value={kpis[growth]} />}
        </div>
      ))}
    </div>
  );
}

/**
 * Positive change wears plain ink; only a fall is coloured. The arrow carries the
 * direction too, so the meaning never rests on colour alone.
 */
function Change({ value }) {
  const falling = value < 0;
  const Icon = falling ? TrendingDown : TrendingUp;

  return (
    <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${falling ? 'text-loss' : 'text-ink/70'}`}>
      <Icon size={13} aria-hidden="true" />
      <span className="font-medium tabular-nums">{formatSignedPercent(value)}</span>
      <span>on last month</span>
    </p>
  );
}

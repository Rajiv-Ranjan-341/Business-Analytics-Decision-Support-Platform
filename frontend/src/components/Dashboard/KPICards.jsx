import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Percent,
  Package,
  BarChart3,
} from 'lucide-react';

const CARD_CONFIG = [
  { key: 'total_revenue', label: 'Total Revenue', icon: DollarSign, format: 'currency', color: 'blue' },
  { key: 'total_profit', label: 'Total Profit', icon: TrendingUp, format: 'currency', color: 'green' },
  { key: 'profit_margin', label: 'Profit Margin', icon: Percent, format: 'percent', color: 'purple' },
  { key: 'total_orders', label: 'Total Orders', icon: ShoppingCart, format: 'number', color: 'orange' },
  { key: 'unique_customers', label: 'Customers', icon: Users, format: 'number', color: 'indigo' },
  { key: 'avg_order_value', label: 'Avg Order Value', icon: BarChart3, format: 'currency', color: 'teal' },
  { key: 'total_units_sold', label: 'Units Sold', icon: Package, format: 'number', color: 'pink' },
  { key: 'avg_discount', label: 'Avg Discount', icon: Percent, format: 'percent', color: 'amber' },
];

const COLORS = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  teal: 'bg-teal-50 text-teal-600',
  pink: 'bg-pink-50 text-pink-600',
  amber: 'bg-amber-50 text-amber-600',
};

function formatValue(value, format) {
  if (value == null) return '-';
  if (format === 'currency') {
    if (value >= 1e7) return `$${(value / 1e7).toFixed(2)}Cr`;
    if (value >= 1e5) return `$${(value / 1e5).toFixed(2)}L`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  }
  if (format === 'percent') return `${value}%`;
  if (format === 'number') return value.toLocaleString();
  return value;
}

export default function KPICards({ kpis }) {
  const cards = CARD_CONFIG.filter((c) => kpis[c.key] != null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map(({ key, label, icon: Icon, format, color }) => (
        <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${COLORS[color]}`}>
              <Icon size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatValue(kpis[key], format)}</p>
          {key === 'total_revenue' && kpis.revenue_growth_pct != null && (
            <GrowthBadge value={kpis.revenue_growth_pct} label="vs last month" />
          )}
          {key === 'total_profit' && kpis.profit_growth_pct != null && (
            <GrowthBadge value={kpis.profit_growth_pct} label="vs last month" />
          )}
        </div>
      ))}
    </div>
  );
}

function GrowthBadge({ value, label }) {
  const isPositive = value >= 0;
  return (
    <div className="flex items-center gap-1 mt-1">
      {isPositive ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-500" />}
      <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{value}%
      </span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Award } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import { getProductProfitability } from '../api/client';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function ProductsPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!datasetId) return;
    setLoading(true);
    setError(null);
    getProductProfitability(datasetId)
      .then(setData)
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [datasetId]);

  return (
    <div>
      <PageHeader title="Product Profitability" description="Analyze products by revenue, profit, and margin. High sales don't always mean high profit." />
      <DatasetSelector selectedId={datasetId} onSelect={setDatasetId} />

      {!datasetId && <Placeholder text="Select a dataset to analyze product profitability." />}
      {error && <ErrorMsg text={error} />}
      {loading && <LoadingSpinner message="Analyzing product profitability..." />}

      {data && !loading && (
        <>
          <SummaryCards summary={data.summary} />
          <ProductTags tags={data.tags} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <MarginScatter scatter={data.scatter} />
            <TopProductsBar products={data.products.slice(0, 10)} />
          </div>
          <ProductTable products={data.products} />
        </>
      )}
    </div>
  );
}

function SummaryCards({ summary }) {
  const cards = [
    { label: 'Total Products', value: summary.total_products },
    { label: 'Total Revenue', value: `$${summary.total_revenue.toLocaleString()}` },
    summary.total_profit != null && { label: 'Total Profit', value: `$${summary.total_profit.toLocaleString()}` },
    summary.avg_margin_pct != null && { label: 'Avg Margin', value: `${summary.avg_margin_pct}%` },
    summary.loss_making_products != null && { label: 'Loss-Making', value: summary.loss_making_products, warn: summary.loss_making_products > 0 },
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      {cards.map(({ label, value, warn }) => (
        <div key={label} className={`bg-white border rounded-xl p-3 text-center ${warn ? 'border-red-300' : 'border-gray-200'}`}>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-lg font-bold ${warn ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function ProductTags({ tags }) {
  const tagConfig = [
    { key: 'loss_making', label: 'Loss-Making Products', icon: AlertTriangle, color: 'red' },
    { key: 'high_revenue_low_margin', label: 'High Revenue, Low Margin', icon: TrendingDown, color: 'amber' },
    { key: 'high_margin', label: 'High Margin (>30%)', icon: TrendingUp, color: 'green' },
    { key: 'top_sellers', label: 'Top Sellers by Revenue', icon: Award, color: 'blue' },
  ];

  const colorMap = {
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      {tagConfig.map(({ key, label, icon: Icon, color }) => {
        const items = tags[key] || [];
        if (items.length === 0) return null;
        return (
          <div key={key} className={`border rounded-lg p-3 ${colorMap[color]}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <p className="text-xs">{items.slice(0, 3).join(', ')}{items.length > 3 ? ` +${items.length - 3} more` : ''}</p>
          </div>
        );
      })}
    </div>
  );
}

function MarginScatter({ scatter }) {
  if (!scatter || scatter.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue vs Profit Margin</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" dataKey="revenue" name="Revenue" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis type="number" dataKey="margin_pct" name="Margin %" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip formatter={(v, name) => [typeof v === 'number' ? (name === 'Revenue' ? `$${v.toLocaleString()}` : `${v}%`) : v, name]} />
          <Scatter data={scatter} name="Products">
            {scatter.map((p, i) => (
              <Cell key={i} fill={p.margin_pct < 0 ? '#ef4444' : p.margin_pct > 30 ? '#22c55e' : '#3b82f6'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopProductsBar({ products }) {
  const data = products.map((p) => ({
    name: p.product.length > 25 ? p.product.slice(0, 25) + '...' : p.product,
    revenue: p.revenue,
    profit: p.profit || 0,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 10 Products</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} width={140} />
          <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, undefined]} />
          <Legend />
          <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" barSize={10} />
          <Bar dataKey="profit" fill="#22c55e" name="Profit" barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProductTable({ products }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">All Products</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Category</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Revenue</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Profit</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Margin %</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Units</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rev Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => (
              <tr key={p.product} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate">{p.product}</td>
                <td className="px-3 py-2 text-gray-600 text-xs">{p.category || '-'}</td>
                <td className="px-3 py-2 text-right text-gray-700">${p.revenue.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-medium ${p.profit != null && p.profit < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {p.profit != null ? `$${p.profit.toLocaleString()}` : '-'}
                </td>
                <td className={`px-3 py-2 text-right ${p.margin_pct != null && p.margin_pct < 0 ? 'text-red-600' : p.margin_pct > 30 ? 'text-green-600' : 'text-gray-700'}`}>
                  {p.margin_pct != null ? `${p.margin_pct}%` : '-'}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">{p.units_sold ?? '-'}</td>
                <td className="px-3 py-2 text-right text-gray-500">{p.revenue_share_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Placeholder({ text }) {
  return <div className="bg-white border border-gray-200 rounded-xl p-12 text-center"><p className="text-gray-400 text-sm">{text}</p></div>;
}
function ErrorMsg({ text }) {
  return <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{text}</div>;
}

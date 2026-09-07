import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function SalesChart({ data, title = 'Revenue & Profit Trend' }) {
  if (!data || data.length === 0) {
    return <ChartEmpty title={title} />;
  }

  const hasProfit = data.some((d) => d.profit != null);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            tickFormatter={(v) => {
              const d = new Date(v);
              return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }}
          />
          <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
          <Tooltip
            formatter={(v) => [`$${v.toLocaleString()}`, undefined]}
            labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Revenue" />
          {hasProfit && (
            <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Profit" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartEmpty({ title }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    </div>
  );
}

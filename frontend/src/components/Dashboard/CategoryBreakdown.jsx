import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function CategoryBreakdown({ categoryData, regionData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categoryData && categoryData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 12, fill: '#6b7280' }} width={100} />
              <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {regionData && regionData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Region</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={regionData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                nameKey="region"
                label={({ region, percent }) => `${region} ${(percent * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {regionData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

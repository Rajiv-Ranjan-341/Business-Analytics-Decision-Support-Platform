import { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Play, Users } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import { runSegmentation } from '../api/client';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function CustomersPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSegment() {
    if (!datasetId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await runSegmentation(datasetId);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Segmentation failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Customer Intelligence"
        description="Segment customers using RFM analysis and K-Means clustering."
      />

      <DatasetSelector selectedId={datasetId} onSelect={setDatasetId} />

      {datasetId && (
        <div className="mb-6">
          <button
            onClick={handleSegment}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Play size={14} />
            {loading ? 'Segmenting...' : 'Run Segmentation'}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && <LoadingSpinner message="Running RFM analysis and K-Means clustering..." />}

      {result && !loading && (
        <>
          <RFMSummary summary={result.rfm_summary} nClusters={result.n_clusters} silhouette={result.silhouette_score} />
          <SegmentCards segments={result.segments} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <SegmentScatter scatterData={result.scatter_data} segments={result.segments} />
            <SegmentBars segments={result.segments} />
          </div>
          <SegmentTable segments={result.segments} />
        </>
      )}
    </div>
  );
}

function RFMSummary({ summary, nClusters, silhouette }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {[
        { label: 'Customers', value: summary.total_customers },
        { label: 'Segments', value: nClusters },
        { label: 'Silhouette Score', value: silhouette },
        { label: 'Avg Recency (days)', value: summary.avg_recency },
        { label: 'Avg Monetary', value: `$${summary.avg_monetary.toLocaleString()}` },
      ].map(({ label, value }) => (
        <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

function SegmentCards({ segments }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      {segments.map((seg, i) => (
        <div key={seg.cluster_id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <h4 className="text-sm font-semibold text-gray-800">{seg.name}</h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Customers</span>
              <p className="font-medium text-gray-800">{seg.count} ({seg.pct_of_total}%)</p>
            </div>
            <div>
              <span className="text-gray-500">Avg Revenue</span>
              <p className="font-medium text-gray-800">${seg.avg_monetary.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-500">Avg Recency</span>
              <p className="font-medium text-gray-800">{seg.avg_recency} days</p>
            </div>
            <div>
              <span className="text-gray-500">Avg Frequency</span>
              <p className="font-medium text-gray-800">{seg.avg_frequency}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SegmentScatter({ scatterData, segments }) {
  const byCluster = {};
  scatterData.forEach((d) => {
    if (!byCluster[d.cluster]) byCluster[d.cluster] = [];
    byCluster[d.cluster].push(d);
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Customer Segments (Frequency vs Monetary)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" dataKey="frequency" name="Frequency" tick={{ fontSize: 12, fill: '#9ca3af' }} label={{ value: 'Frequency', position: 'bottom', fontSize: 12 }} />
          <YAxis type="number" dataKey="monetary" name="Monetary" tick={{ fontSize: 12, fill: '#9ca3af' }} label={{ value: 'Monetary ($)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, name) => [typeof v === 'number' ? v.toLocaleString() : v, name]} />
          <Legend />
          {Object.entries(byCluster).map(([clusterId, data], i) => {
            const seg = segments.find((s) => s.cluster_id === Number(clusterId));
            return (
              <Scatter
                key={clusterId}
                name={seg?.name || `Cluster ${clusterId}`}
                data={data}
                fill={COLORS[i % COLORS.length]}
              />
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function SegmentBars({ segments }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Segment</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={segments} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Total Revenue']} />
          <Bar dataKey="total_revenue" radius={[4, 4, 0, 0]}>
            {segments.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SegmentTable({ segments }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Segment Details</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Segment</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Customers</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">% of Total</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Avg Recency</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Avg Frequency</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Avg Monetary</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {segments.map((seg, i) => (
              <tr key={seg.cluster_id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium text-gray-800">{seg.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-gray-700">{seg.count}</td>
                <td className="px-3 py-2 text-right text-gray-700">{seg.pct_of_total}%</td>
                <td className="px-3 py-2 text-right text-gray-700">{seg.avg_recency} days</td>
                <td className="px-3 py-2 text-right text-gray-700">{seg.avg_frequency}</td>
                <td className="px-3 py-2 text-right text-gray-700">${seg.avg_monetary.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">${seg.total_revenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

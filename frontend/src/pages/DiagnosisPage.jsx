import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import { getDiagnosis } from '../api/client';

export default function DiagnosisPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!datasetId) return;
    setLoading(true);
    setError(null);
    getDiagnosis(datasetId)
      .then(setData)
      .catch((err) => setError(err.response?.data?.detail || 'Diagnosis failed'))
      .finally(() => setLoading(false));
  }, [datasetId]);

  return (
    <div>
      <PageHeader
        title="Business Diagnosis"
        description="Understand what's driving month-over-month changes in your key metrics."
      />
      <DatasetSelector selectedId={datasetId} onSelect={setDatasetId} />

      {!datasetId && <Placeholder text="Select a dataset to diagnose metric changes." />}
      {error && <ErrorMsg text={error} />}
      {loading && <LoadingSpinner message="Analyzing metric changes across dimensions..." />}

      {data && !loading && (
        <>
          <OverviewCard overview={data.overview} />
          <TopContributors contributors={data.top_contributors} />
          <DimensionPanels dimensions={data.dimensions} />
        </>
      )}
    </div>
  );
}

function OverviewCard({ overview }) {
  const isDown = overview.absolute_change < 0;
  const Icon = isDown ? TrendingDown : TrendingUp;
  const colorClass = isDown ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50';
  const textColor = isDown ? 'text-red-700' : 'text-green-700';

  return (
    <div className={`border rounded-xl p-5 mb-6 ${colorClass}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDown ? 'bg-red-100' : 'bg-green-100'}`}>
          <Icon size={20} className={textColor} />
        </div>
        <div>
          <h3 className={`text-lg font-bold ${textColor}`}>
            {overview.metric} {overview.direction} {Math.abs(overview.pct_change)}%
          </h3>
          <p className="text-sm text-gray-600">
            {overview.previous_month} (${overview.previous_value.toLocaleString()}) &rarr; {overview.current_month} (${overview.current_value.toLocaleString()})
          </p>
        </div>
      </div>
      <p className={`text-sm font-medium ${textColor}`}>
        Change: ${overview.absolute_change.toLocaleString()}
      </p>
    </div>
  );
}

function TopContributors({ contributors }) {
  if (!contributors || contributors.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <AlertCircle size={16} className="text-amber-500" />
        Top Contributing Factors
      </h3>
      <div className="space-y-2">
        {contributors.map((c, i) => {
          const isNeg = c.change < 0;
          return (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">{c.dimension}</span>
                <p className="text-sm font-medium text-gray-800">{c.value}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${isNeg ? 'text-red-600' : 'text-green-600'}`}>
                  {isNeg ? '' : '+'}{c.change.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{c.pct_change > 0 ? '+' : ''}{c.pct_change}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DimensionPanels({ dimensions }) {
  if (!dimensions || dimensions.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Breakdown by Dimension</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dimensions.map((dim) => (
          <div key={dim.dimension} className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">{dim.dimension}</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dim.contributions.slice(0, 8)} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="value" tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  formatter={(v) => [`$${v.toLocaleString()}`, 'Change']}
                  labelFormatter={(v) => `${dim.dimension}: ${v}`}
                />
                <Bar dataKey="change" name="Change">
                  {dim.contributions.slice(0, 8).map((c, i) => (
                    <Cell key={i} fill={c.change < 0 ? '#ef4444' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
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

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { Play, CheckCircle, AlertTriangle, XCircle, Brain } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import { runWhatIf, getExplanation } from '../api/client';

const SLIDERS = [
  { key: 'price_change_pct', label: 'Price Change (%)', min: -50, max: 50 },
  { key: 'discount_change_pct', label: 'Discount Change (pp)', min: -20, max: 30 },
  { key: 'quantity_change_pct', label: 'Demand Change (%)', min: -50, max: 50 },
  { key: 'cost_change_pct', label: 'Cost Change (%)', min: -30, max: 50 },
];

export default function SimulatorPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [params, setParams] = useState({ price_change_pct: 0, discount_change_pct: 0, quantity_change_pct: 0, cost_change_pct: 0 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);

  async function handleRun() {
    if (!datasetId) return;
    setLoading(true);
    setError(null);
    const adjustments = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== 0) adjustments[k] = v;
    }
    if (Object.keys(adjustments).length === 0) {
      setError('Adjust at least one parameter');
      setLoading(false);
      return;
    }
    try {
      const data = await runWhatIf(datasetId, adjustments);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleExplain() {
    if (!datasetId) return;
    setExplainLoading(true);
    try {
      const data = await getExplanation(datasetId);
      setExplanation(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Explanation failed');
    } finally {
      setExplainLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="What-If Simulator" description="Adjust business variables and see predicted impact on revenue and profit." />
      <DatasetSelector selectedId={datasetId} onSelect={(id) => { setDatasetId(id); setResult(null); setExplanation(null); }} />

      {datasetId && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Adjust Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SLIDERS.map(({ key, label, min, max }) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <label className="text-gray-600">{label}</label>
                  <span className={`font-medium ${params[key] > 0 ? 'text-green-600' : params[key] < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {params[key] > 0 ? '+' : ''}{params[key]}%
                  </span>
                </div>
                <input
                  type="range" min={min} max={max} step={1} value={params[key]}
                  onChange={(e) => setParams((p) => ({ ...p, [key]: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>{min}%</span><span>0</span><span>{max}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleRun} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Play size={14} />{loading ? 'Simulating...' : 'Run Simulation'}
            </button>
            <button onClick={() => setParams({ price_change_pct: 0, discount_change_pct: 0, quantity_change_pct: 0, cost_change_pct: 0 })}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Reset
            </button>
          </div>
        </div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{error}</div>}
      {loading && <LoadingSpinner message="Running what-if simulation..." />}

      {result && !loading && (
        <>
          <Recommendation rec={result.recommendation} changes={result.changes_applied} />
          <ComparisonChart comparison={result.comparison} />
          <ComparisonTable comparison={result.comparison} />
        </>
      )}

      {datasetId && (
        <div className="mt-6">
          <button onClick={handleExplain} disabled={explainLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50">
            <Brain size={14} />{explainLoading ? 'Generating...' : 'Explain with SHAP'}
          </button>
          {explainLoading && <LoadingSpinner message="Training model and computing SHAP values..." />}
          {explanation && !explainLoading && <SHAPSection data={explanation} />}
        </div>
      )}
    </div>
  );
}

function Recommendation({ rec, changes }) {
  const icons = { positive: CheckCircle, cautious: AlertTriangle, negative: XCircle, neutral: AlertTriangle };
  const colors = {
    positive: 'border-green-300 bg-green-50 text-green-700',
    cautious: 'border-amber-300 bg-amber-50 text-amber-700',
    negative: 'border-red-300 bg-red-50 text-red-700',
    neutral: 'border-gray-300 bg-gray-50 text-gray-700',
  };
  const Icon = icons[rec.verdict] || AlertTriangle;

  return (
    <div className={`border rounded-xl p-4 mb-4 ${colors[rec.verdict]}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">{rec.text}</p>
          {changes.length > 0 && (
            <p className="text-xs mt-1 opacity-75">
              Changes: {changes.map((c) => `${c.parameter} ${c.change}`).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ComparisonChart({ comparison }) {
  const chartData = comparison.filter((c) => c.key !== 'avg_discount_pct').map((c) => ({
    metric: c.metric,
    baseline: c.baseline,
    simulated: c.simulated,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Baseline vs Simulated</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip formatter={(v) => [typeof v === 'number' ? v.toLocaleString() : v, undefined]} />
          <Legend />
          <Bar dataKey="baseline" fill="#94a3b8" name="Baseline" />
          <Bar dataKey="simulated" fill="#3b82f6" name="Simulated" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparisonTable({ comparison }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Detailed Comparison</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Metric</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Baseline</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Simulated</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Change</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">% Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {comparison.map((c) => (
            <tr key={c.key} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800">{c.metric}</td>
              <td className="px-3 py-2 text-right text-gray-600">{c.baseline.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-gray-800">{c.simulated.toLocaleString()}</td>
              <td className={`px-3 py-2 text-right font-medium ${c.change > 0 ? 'text-green-600' : c.change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {c.change > 0 ? '+' : ''}{c.change.toLocaleString()}
              </td>
              <td className={`px-3 py-2 text-right ${c.pct_change > 0 ? 'text-green-600' : c.pct_change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {c.pct_change > 0 ? '+' : ''}{c.pct_change}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SHAPSection({ data }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Feature Importance (SHAP)</h3>
        <p className="text-xs text-gray-500 mb-3">
          Trained on {data.n_samples} samples with {data.n_features} features. Higher SHAP values mean stronger influence on {data.target}.
        </p>
        <div className="space-y-2">
          {data.feature_importance.map((f) => {
            const maxImp = data.feature_importance[0]?.importance || 1;
            const widthPct = Math.max(5, (f.importance / maxImp) * 100);
            return (
              <div key={f.feature} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-40 truncate text-right">{f.feature}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                  <div className="bg-purple-500 rounded-full h-5 flex items-center justify-end pr-2" style={{ width: `${widthPct}%` }}>
                    <span className="text-[10px] text-white font-medium">{f.importance.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.bar_plot && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">SHAP Bar Plot</h3>
          <img src={`data:image/png;base64,${data.bar_plot}`} alt="SHAP bar plot" className="w-full rounded" />
        </div>
      )}

      {data.summary_plot && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">SHAP Summary Plot</h3>
          <img src={`data:image/png;base64,${data.summary_plot}`} alt="SHAP summary plot" className="w-full rounded" />
        </div>
      )}
    </div>
  );
}

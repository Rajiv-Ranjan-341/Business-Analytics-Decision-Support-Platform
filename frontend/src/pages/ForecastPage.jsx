import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import { Play, Trophy } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import { runForecast } from '../api/client';

export default function ForecastPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [periods, setPeriods] = useState(6);
  const [periodType, setPeriodType] = useState('weekly');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleRunForecast() {
    if (!datasetId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await runForecast(datasetId, { periods, periodType });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Forecasting failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const chartData = result
    ? [
        ...result.historical.map((h) => ({ date: h.date, actual: h.value })),
        ...result.forecast.map((f) => ({
          date: f.date,
          forecast: f.value,
          lower: f.lower,
          upper: f.upper,
        })),
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Sales & Demand Forecasting"
        description="Predict future trends using XGBoost and Exponential Smoothing models."
      />

      <DatasetSelector selectedId={datasetId} onSelect={setDatasetId} />

      {datasetId && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Period Type</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Periods Ahead</label>
              <input
                type="number"
                value={periods}
                onChange={(e) => setPeriods(Math.max(1, Math.min(24, Number(e.target.value))))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20"
                min={1}
                max={24}
              />
            </div>
            <button
              onClick={handleRunForecast}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Play size={14} />
              {loading ? 'Running...' : 'Run Forecast'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && <LoadingSpinner message="Training models and generating forecast..." />}

      {result && !loading && (
        <>
          <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Trophy size={16} className="text-green-600" />
            <span className="text-sm text-green-700">
              Best model: <strong>{result.best_model}</strong>
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Forecast: {result.column} ({result.period_type})
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  formatter={(v, name) => [typeof v === 'number' ? v.toLocaleString() : v, name]}
                />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Actual" />
                <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Forecast" />
                <Area type="monotone" dataKey="upper" stroke="none" fill="#f59e0b" fillOpacity={0.1} name="Upper Bound" />
                <Area type="monotone" dataKey="lower" stroke="none" fill="#f59e0b" fillOpacity={0.1} name="Lower Bound" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <ModelComparison models={result.models} bestModel={result.best_model} />

          <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Forecast Values</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Forecast</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Lower Bound</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Upper Bound</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.forecast.map((f) => (
                    <tr key={f.date} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{new Date(f.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{f.value.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{f.lower.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{f.upper.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ModelComparison({ models, bestModel }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Model Comparison</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(models).map(([key, model]) => {
          const name = key === 'xgboost' ? 'XGBoost' : 'Exponential Smoothing';
          const isBest = name === bestModel;
          return (
            <div
              key={key}
              className={`p-4 rounded-lg border ${isBest ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-gray-800">{name}</span>
                {isBest && (
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">Best</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">MAE</p>
                  <p className="text-sm font-semibold text-gray-800">{model.mae}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">RMSE</p>
                  <p className="text-sm font-semibold text-gray-800">{model.rmse}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">MAPE</p>
                  <p className="text-sm font-semibold text-gray-800">{model.mape}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  Line,
  ComposedChart,
} from 'recharts';
import { AlertCircle, Play, Trophy } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import Panel from '../components/Shared/Panel';
import {
  formatCurrencyAxis,
  formatCurrencyExact,
  formatPercent,
  SERIES,
  CHART_INK,
} from '../lib/format';
import { runForecast } from '../api/client';
import { chartAnim } from '../lib/motion';
import { wasScored } from '../lib/forecast';

// History and forecast are the same measure on the same axis, so they are told
// apart by stroke, not by scale: history is solid, the projection is dashed and
// carries the range band behind it.
const HISTORY_COLOR = SERIES[0];
const FORECAST_COLOR = SERIES[1];

const PERIODS = {
  daily: { label: 'Daily', grouped: 'by day', units: 'days' },
  weekly: { label: 'Weekly', grouped: 'by week', units: 'weeks' },
  monthly: { label: 'Monthly', grouped: 'by month', units: 'months' },
};

const MODEL_NAMES = { xgboost: 'XGBoost', exp_smoothing: 'Exponential smoothing' };

/* Most things that stop a run are a column whose meaning was never set, so the
   error ends at the one screen that can fix it rather than leaving a person to
   find it. */
const FIX_LINK =
  'font-medium text-ink underline underline-offset-4 hover:no-underline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

function toDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatAxisDate(value, periodType) {
  const d = toDate(value);
  if (!d) return value;
  if (periodType === 'monthly') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatFullDate(value) {
  const d = toDate(value);
  if (!d) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ForecastPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [periods, setPeriods] = useState(6);
  const [periodType, setPeriodType] = useState('weekly');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Switching datasets used to leave the previous dataset's forecast on screen,
  // labelled as if it belonged to the newly chosen one.
  function handleSelectDataset(id) {
    setDatasetId(id);
    setResult(null);
    setError(null);
  }

  async function handleRunForecast() {
    if (!datasetId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await runForecast(datasetId, { periods, periodType });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'The server did not answer. It may not be running.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Forecast"
        description="Two models run against your sales history. Whichever one predicted your past more accurately is the one you get, and this page tells you which it picked and how far off it has been running."
      />

      <DatasetSelector selectedId={datasetId} onSelect={handleSelectDataset} />

      {datasetId ? (
        <Panel
          className="mb-6"
          title="Set up the run"
          description="Choose how to group your history and how far past the last sale to project."
        >
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="forecast-period-type" className="mb-1 block text-sm font-medium text-ink/75">
                Group history
              </label>
              <select
                id="forecast-period-type"
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="border border-kraft bg-sheet px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {Object.entries(PERIODS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="forecast-periods" className="mb-1 block text-sm font-medium text-ink/75">
                Periods ahead
              </label>
              <input
                id="forecast-periods"
                type="number"
                value={periods}
                onChange={(e) => setPeriods(Math.max(1, Math.min(24, Number(e.target.value))))}
                className="w-24 border border-kraft bg-sheet px-3 py-2 text-sm tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                min={1}
                max={24}
                aria-describedby="forecast-periods-hint"
              />
            </div>

            <button
              type="button"
              onClick={handleRunForecast}
              disabled={loading}
              className="flex items-center gap-2 bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-ink/70"
            >
              <Play size={14} aria-hidden="true" />
              {loading ? 'Running' : 'Run the forecast'}
            </button>
          </div>

          <p id="forecast-periods-hint" className="mt-3 text-sm text-ink/70">
            Between 1 and 24 periods ahead. The further out you look, the wider the range gets.
          </p>
        </Panel>
      ) : (
        <Panel>
          <p className="text-ink/75">Pick a dataset above and this page will forecast it.</p>
        </Panel>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 border-l-[3px] border-warn bg-sheet py-3 pr-4 pl-3.5 text-sm text-ink"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          <div>
            <p className="max-w-[70ch] font-medium">The forecast stopped: {error}</p>
            <p className="mt-1 max-w-[70ch] text-ink/75">
              A forecast needs one column set as the date and one set as your sales figures, and at
              least six periods of history once the file is grouped.{' '}
              <Link to="/upload" className={FIX_LINK}>
                Open your files
              </Link>
              , open this one, and set its column meanings. Grouping by month instead of by day
              often fixes a run that is short on periods.
            </p>
          </div>
        </div>
      )}

      {loading && <LoadingSpinner message="Training both models and projecting forward" />}

      {!loading && !error && datasetId && !result && (
        <Panel>
          <p className="max-w-[70ch] text-ink/75">
            Nothing forecast yet. Set the two options above and run it. Forecasts read best with
            roughly thirty periods of history behind them, so grouping a short file by month may
            leave too little to learn from.
          </p>
        </Panel>
      )}

      {result && !loading && <ForecastResult result={result} />}
    </div>
  );
}

function ForecastResult({ result }) {
  const period = PERIODS[result.period_type] || PERIODS.monthly;
  // The backend names the winner in prose ("Exponential Smoothing"); match it back
  // to a metrics key rather than assuming which of the two it is.
  const bestKey = Object.keys(MODEL_NAMES).find(
    (key) => MODEL_NAMES[key].toLowerCase() === String(result.best_model).toLowerCase()
  );
  const best = bestKey ? result.models?.[bestKey] : null;
  const bestScored = best ? wasScored(best) : false;
  const bestName = bestKey ? MODEL_NAMES[bestKey] : result.best_model;

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2.5 bg-sticker px-4 py-3 text-ink">
        <Trophy size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="max-w-[78ch]">
          <span className="font-semibold">{bestName}</span> won this run.{' '}
          {bestScored ? (
            <>
              Measured against the slice of history held back from training, it missed by{' '}
              <span className="font-semibold tabular-nums">{formatPercent(best.mape)}</span> on
              average. Read the projection as a direction, not a promise.
            </>
          ) : (
            <>
              There was too little history left over to score it, so no error figure stands behind
              this projection. Add more sales or group by a shorter period before trusting it.
            </>
          )}
        </span>
      </p>

      <Panel
        title="History and forecast"
        description={`Your ${result.column} grouped ${period.grouped}, with the next ${result.periods} ${period.units} projected. The band behind the dashed line is the range the model puts around each projected point.`}
      >
        <ForecastChart result={result} />
      </Panel>

      <ModelComparison models={result.models} bestModel={result.best_model} />

      <Panel
        title="Forecast, period by period"
        description="The same projection as figures, with the low and high edge of each range."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <caption className="sr-only">Projected {result.column} for each upcoming period</caption>
            <thead>
              <tr className="border-b border-kraft">
                <th scope="col" className="py-2 pr-4 text-left font-medium text-ink/75">
                  Period starting
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                  Forecast
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                  Low
                </th>
                <th scope="col" className="py-2 text-right font-medium text-ink/75">
                  High
                </th>
              </tr>
            </thead>
            <tbody>
              {(result.forecast || []).map((f) => (
                <tr key={f.date} className="border-b border-kraft last:border-b-0">
                  <td className="py-2.5 pr-4 text-ink">{formatFullDate(f.date)}</td>
                  <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-ink">
                    {formatCurrencyExact(f.value)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-ink/75">
                    {formatCurrencyExact(f.lower)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-ink/75">
                    {formatCurrencyExact(f.upper)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/**
 * Dots are drawn only where the series actually has a point. The last historical
 * value is repeated into the forecast series so the dashed line and its band start
 * from the last real sale rather than floating in space, and that repeated point
 * is suppressed here so it does not show two markers stacked on one another.
 */
function dotFor(color, kind) {
  return ({ cx, cy, payload }) => {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    if (payload?.kind !== kind) return null;
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke={CHART_INK.surface} strokeWidth={1.5} />;
  };
}

const historyDot = dotFor(HISTORY_COLOR, 'history');
const forecastDot = dotFor(FORECAST_COLOR, 'forecast');

function ForecastChart({ result }) {
  const history = result.historical || [];
  const forecast = result.forecast || [];
  const lastIndex = history.length - 1;

  const chartData = [
    ...history.map((h, i) => ({
      date: h.date,
      actual: h.value,
      kind: 'history',
      ...(i === lastIndex ? { forecast: h.value, range: [h.value, h.value] } : {}),
    })),
    ...forecast.map((f) => ({
      date: f.date,
      forecast: f.value,
      lower: f.lower,
      upper: f.upper,
      range: [f.lower, f.upper],
      kind: 'forecast',
    })),
  ];

  const showDots = chartData.length <= 40;

  return (
    <>
      <ul className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink/75">
        <li className="flex items-center gap-2">
          <svg width="24" height="8" className="shrink-0" aria-hidden="true">
            <line x1="0" y1="4" x2="24" y2="4" stroke={HISTORY_COLOR} strokeWidth="2" />
          </svg>
          Sold
        </li>
        <li className="flex items-center gap-2">
          <svg width="24" height="8" className="shrink-0" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="24"
              y2="4"
              stroke={FORECAST_COLOR}
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          </svg>
          Forecast
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="block h-3 w-6 shrink-0"
            style={{ backgroundColor: FORECAST_COLOR, opacity: 0.16 }}
          />
          Forecast range
        </li>
      </ul>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_INK.grid} strokeDasharray="none" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatAxisDate(v, result.period_type)}
            tick={{ fontSize: 11, fill: CHART_INK.label }}
            axisLine={{ stroke: CHART_INK.axis }}
            tickLine={false}
            minTickGap={24}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatCurrencyAxis}
            tick={{ fontSize: 11, fill: CHART_INK.label }}
            axisLine={{ stroke: CHART_INK.axis }}
            tickLine={false}
            width={72}
          />
          <Tooltip
            content={<ChartTooltip periodType={result.period_type} />}
            cursor={{ stroke: CHART_INK.axis, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="range"
            stroke="none"
            fill={FORECAST_COLOR}
            fillOpacity={0.16}
            {...chartAnim()}
            activeDot={false}
            name="Forecast range"
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Sold"
            stroke={HISTORY_COLOR}
            strokeWidth={2}
            dot={showDots ? historyDot : false}
            activeDot={{ r: 5, fill: HISTORY_COLOR, stroke: CHART_INK.surface, strokeWidth: 2 }}
            {...chartAnim()}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke={FORECAST_COLOR}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={showDots ? forecastDot : false}
            activeDot={{ r: 5, fill: FORECAST_COLOR, stroke: CHART_INK.surface, strokeWidth: 2 }}
            {...chartAnim()}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

function ChartTooltip({ active, payload, periodType }) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  if (!row) return null;

  return (
    <div className="border border-kraft bg-sheet px-3 py-2 text-sm text-ink">
      <p className="font-medium">{formatAxisDate(row.date, periodType)}</p>
      {row.kind === 'history' ? (
        <p className="mt-1 tabular-nums">Sold {formatCurrencyExact(row.actual)}</p>
      ) : (
        <>
          <p className="mt-1 tabular-nums">Forecast {formatCurrencyExact(row.forecast)}</p>
          <p className="mt-0.5 tabular-nums text-ink/75">
            Range {formatCurrencyExact(row.lower)} to {formatCurrencyExact(row.upper)}
          </p>
        </>
      )}
    </div>
  );
}

function ModelComparison({ models, bestModel }) {
  const entries = Object.entries(models || {});
  const anyUnscored = entries.some(([, model]) => !wasScored(model));

  return (
    <Panel
      title="How the two models scored"
      description="Both models learned from the front of your history and were scored on the tail they never saw. MAE is the average miss, RMSE punishes the occasional big miss harder, and MAPE is the average miss as a share of the real figure. Lower is better in all three."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">Accuracy of each model on the held-back history</caption>
          <thead>
            <tr className="border-b border-kraft">
              <th scope="col" className="py-2 pr-4 text-left font-medium text-ink/75">
                Model
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                MAE
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                RMSE
              </th>
              <th scope="col" className="py-2 text-right font-medium text-ink/75">
                MAPE
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, model]) => {
              const name = MODEL_NAMES[key] || key;
              const isBest = name.toLowerCase() === String(bestModel).toLowerCase();
              const scored = wasScored(model);

              return (
                <tr key={key} className="border-b border-kraft last:border-b-0">
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium text-ink">
                    {name}
                    {isBest && (
                      <span className="ml-2 inline-block bg-ink px-1.5 py-0.5 text-xs font-medium text-paper">
                        Picked
                      </span>
                    )}
                  </th>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                    {scored ? formatCurrencyExact(model.mae) : '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                    {scored ? formatCurrencyExact(model.rmse) : '—'}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-ink">
                    {scored ? formatPercent(model.mape) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {anyUnscored && (
        <p className="mt-3 max-w-[70ch] text-sm text-ink/75">
          A dash means there was not enough history left over to score that model, so it has no
          measured accuracy behind it.
        </p>
      )}
    </Panel>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Brain, CheckCircle, Minus, Play, RotateCcw, XCircle } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import Panel from '../components/Shared/Panel';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import {
  CHART_INK,
  formatCurrencyAxis,
  SERIES,
  formatCurrencyExact,
  formatNumber,
  formatPercent,
  formatSignedPercent,
} from '../lib/format';
import { runWhatIf, getExplanation } from '../api/client';
import { chartAnim } from '../lib/motion';

const DEFAULT_PARAMS = {
  price_change_pct: 0,
  discount_change_pct: 0,
  quantity_change_pct: 0,
  cost_change_pct: 0,
};

/* Most things that stop a run are a column whose meaning was never set, so the
   error ends at the one screen that can fix it rather than leaving a person to
   find it. */
const FIX_LINK =
  'font-medium text-ink underline underline-offset-4 hover:no-underline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/* The one message on this page that the upload screen cannot fix: the sliders are
   all at zero, so there is nothing to simulate. Held as a constant so the error
   block can recognise it and leave the link off. */
const NO_SLIDER_MOVED = 'Move at least one slider away from zero, then run it again.';

// The keys are the API contract and do not change. Only the wording does: these
// read as things a shop owner moves, not as request fields.
const SLIDERS = [
  {
    key: 'price_change_pct',
    label: 'Price',
    unit: '%',
    min: -50,
    max: 50,
    hint: 'What you charge for the same goods.',
  },
  {
    key: 'discount_change_pct',
    label: 'Discount',
    unit: 'pp',
    min: -20,
    max: 30,
    hint: 'Points on or off the discount you give. Each point off is assumed to lift demand about 1.5%.',
  },
  {
    key: 'quantity_change_pct',
    label: 'Demand',
    unit: '%',
    min: -50,
    max: 50,
    hint: 'How many units go out the door.',
  },
  {
    key: 'cost_change_pct',
    label: 'Cost',
    unit: '%',
    min: -30,
    max: 50,
    hint: 'What the goods cost you to buy or make.',
  },
];

/**
 * How each comparison row prints, and — for `money` rows only — what licenses loss
 * red. The palette reserves that colour for negative money, so a falling unit count
 * or a shrinking discount stays plain ink and lets the minus sign carry direction.
 */
const METRICS = {
  total_revenue: { label: 'Sold', kind: 'money' },
  total_profit: { label: 'Kept', kind: 'money' },
  profit_margin_pct: { label: 'Margin', kind: 'percent' },
  total_units: { label: 'Units sold', kind: 'count' },
  avg_discount_pct: { label: 'Average discount', kind: 'percent' },
  avg_revenue_per_order: { label: 'Average order', kind: 'money' },
};

// The two headline money totals. Everything else has a different scale and lives in
// the table instead, because one y-axis cannot honestly carry dollars and percents.
const CHART_KEYS = ['total_revenue', 'total_profit'];

const VERDICTS = {
  positive: { label: 'Worth doing', Icon: CheckCircle, rule: 'border-ink', tone: 'text-ink' },
  cautious: { label: 'Mixed', Icon: AlertTriangle, rule: 'border-warn', tone: 'text-warn' },
  negative: { label: 'Costs you money', Icon: XCircle, rule: 'border-loss', tone: 'text-loss' },
  neutral: { label: 'Nothing moves', Icon: Minus, rule: 'border-kraft', tone: 'text-ink' },
};

const PRIMARY_BUTTON =
  'inline-flex items-center gap-2 bg-ink px-5 py-2.5 font-display text-base font-semibold tracking-wide text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

const SECONDARY_BUTTON =
  'inline-flex items-center gap-2 border border-kraft bg-sheet px-5 py-2.5 font-display text-base font-semibold tracking-wide text-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

// A square ink tick sliding on a kraft rail, to match the ledger surfaces.
const SLIDER_INPUT = [
  'w-full cursor-pointer appearance-none bg-transparent py-2.5',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
  '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-kraft',
  '[&::-webkit-slider-thumb]:mt-[-7px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-ink',
  '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-kraft',
  '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ink',
].join(' ');

// --color-ink at 6%: the hover band behind a bar group, quiet enough to stay under
// the data.
const CHART_CURSOR = { fill: 'rgba(46, 36, 26, 0.06)' };

function metricMeta(row) {
  return METRICS[row.key] || { label: row.metric, kind: 'count' };
}

function formatMetric(value, kind) {
  if (kind === 'money') return formatCurrencyExact(value);
  if (kind === 'percent') return formatPercent(value);
  return formatNumber(value);
}

/** Signed movement. Percent metrics move in points, so they print as pp, not %. */
function formatDelta(value, kind) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  if (kind === 'money') return `${sign}${formatCurrencyExact(value)}`;
  if (kind === 'percent') return `${sign}${value.toFixed(1)}pp`;
  return `${sign}${formatNumber(value)}`;
}

export default function SimulatorPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [params, setParams] = useState({ ...DEFAULT_PARAMS });
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
      setError(NO_SLIDER_MOVED);
      setLoading(false);
      return;
    }
    try {
      const data = await runWhatIf(datasetId, adjustments);
      setResult(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'The scenario could not run. This file needs one column set as your sales figures.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleExplain() {
    if (!datasetId) return;
    setExplainLoading(true);
    // Clear any stale message first, otherwise a failed run keeps its warning on
    // screen next to a successful explanation.
    setError(null);
    try {
      const data = await getExplanation(datasetId);
      setExplanation(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Nothing could be worked out. This needs at least two of quantity, discount, profit, category or region set as a column meaning.',
      );
    } finally {
      setExplainLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="What-if"
        description="Move price, discount, demand or cost, then see what it does to what you sold and what you kept. Nothing here changes your file."
      />

      <DatasetSelector
        selectedId={datasetId}
        onSelect={(id) => {
          setDatasetId(id);
          setResult(null);
          setExplanation(null);
        }}
      />

      {!datasetId && (
        <Panel title="Pick a file first" className="mb-6">
          <p className="max-w-[62ch] text-ink/75">
            Choose a sales file above. The sliders open as soon as one is selected, and every
            scenario you run reads from that file without writing to it.
          </p>
        </Panel>
      )}

      {datasetId && (
        <Panel
          title="Set the scenario"
          description="Each slider starts at no change. Drag it, or focus it and use the arrow keys."
          className="mb-6"
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
            {SLIDERS.map((slider) => (
              <SliderField
                key={slider.key}
                slider={slider}
                value={params[slider.key]}
                onChange={(next) => setParams((p) => ({ ...p, [slider.key]: next }))}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-kraft pt-5">
            <button type="button" onClick={handleRun} disabled={loading} className={PRIMARY_BUTTON}>
              <Play size={15} aria-hidden="true" />
              {loading ? 'Running the scenario' : 'Run the scenario'}
            </button>
            <button
              type="button"
              onClick={() => setParams({ ...DEFAULT_PARAMS })}
              className={SECONDARY_BUTTON}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reset the sliders
            </button>
          </div>
        </Panel>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 border-l-[3px] border-warn bg-sheet py-3 pr-4 pl-3.5 text-sm text-ink"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          <div className="max-w-[70ch]">
            <p>
              <span className="font-semibold">Caution. </span>
              {error}
            </p>
            {error !== NO_SLIDER_MOVED && (
              <p className="mt-1 text-ink/75">
                <Link to="/upload" className={FIX_LINK}>
                  Open your files
                </Link>
                 to check this one's column meanings.
              </p>
            )}
          </div>
        </div>
      )}

      {loading && <LoadingSpinner message="Working out the scenario" />}

      {result && !loading && (
        <>
          <Verdict rec={result.recommendation} changes={result.changes_applied} />
          <ComparisonChart comparison={result.comparison} />
          <ComparisonTable comparison={result.comparison} />
        </>
      )}

      {datasetId && (
        <>
          <Panel
            title="What drives the money"
            description="Trains a model on this file and ranks which of your mapped columns swing revenue most."
            className="mb-6"
          >
            <button
              type="button"
              onClick={handleExplain}
              disabled={explainLoading}
              className={SECONDARY_BUTTON}
            >
              <Brain size={15} aria-hidden="true" />
              {explainLoading ? 'Working it out' : 'Work out what drives revenue'}
            </button>
            {explainLoading && <LoadingSpinner message="Training a model and scoring each column" />}
          </Panel>

          {explanation && !explainLoading && <Explanation data={explanation} />}
        </>
      )}
    </div>
  );
}

function SliderField({ slider, value, onChange }) {
  const { key, label, unit, min, max, hint } = slider;
  const hintId = `${key}-hint`;
  const reading = value === 0 ? 'no change' : `${value > 0 ? '+' : ''}${value}${unit}`;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <label htmlFor={key} className="font-display text-xl font-semibold text-ink">
          {label}
        </label>
        {/* The slider announces this through aria-valuetext, so it is not read twice. */}
        <span className="font-display text-xl font-semibold tabular-nums text-ink" aria-hidden="true">
          {reading}
        </span>
      </div>

      <p id={hintId} className="mt-0.5 max-w-[46ch] text-sm text-ink/70">
        {hint}
      </p>

      <input
        id={key}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={hintId}
        aria-valuetext={reading}
        className={SLIDER_INPUT}
      />

      <div className="flex items-baseline justify-between text-xs tabular-nums text-ink/70">
        <span>
          {min}
          {unit}
        </span>
        <span>
          +{max}
          {unit}
        </span>
      </div>
    </div>
  );
}

/**
 * Three states without a green: positive is plain ink, cautious is warn ochre, and
 * negative is loss red because it points straight at money going down. Each ships
 * its word alongside the colour and an icon, so none of them rests on hue.
 */
function Verdict({ rec, changes }) {
  const { label, Icon, rule, tone } = VERDICTS[rec.verdict] || VERDICTS.neutral;

  return (
    <Panel title="The verdict" className="mb-6">
      <div className={`border-l-[3px] pl-4 ${rule}`}>
        <p className={`flex items-center gap-2 font-display text-2xl font-semibold ${tone}`}>
          <Icon size={22} aria-hidden="true" />
          {label}
        </p>
        <p className="mt-1.5 max-w-[72ch] text-ink/85">{rec.text}</p>

        {changes.length > 0 && (
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-kraft pt-3">
            {changes.map((c) => (
              <div key={c.parameter}>
                <dt className="text-sm text-ink/70">{c.parameter}</dt>
                <dd className="font-display text-lg font-semibold tabular-nums text-ink">
                  {c.change}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Panel>
  );
}

function ComparisonChart({ comparison }) {
  const rows = comparison.filter((c) => CHART_KEYS.includes(c.key));
  if (rows.length === 0) return null;

  const data = rows.map((c) => ({
    metric: METRICS[c.key].label,
    baseline: c.baseline,
    simulated: c.simulated,
  }));

  return (
    <Panel
      title="Sold and kept, before and after"
      description="Only the money totals are plotted. The rest sit in the table below, where their scales do not fight each other."
      className="mb-6"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barGap={2} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
          <XAxis
            dataKey="metric"
            tick={{ fontSize: 12, fill: CHART_INK.label }}
            tickLine={false}
            axisLine={{ stroke: CHART_INK.axis }}
          />
          <YAxis
            width={74}
            tickFormatter={formatCurrencyAxis}
            tick={{ fontSize: 11, fill: CHART_INK.label }}
            tickLine={false}
            axisLine={{ stroke: CHART_INK.axis }}
          />
          <Tooltip cursor={CHART_CURSOR} content={<MoneyTooltip />} />
          <Legend content={<InkLegend />} />
          <Bar dataKey="baseline" name="Now" fill={SERIES[0]} {...chartAnim()}>
            <LabelList
              dataKey="baseline"
              position="top"
              formatter={formatCurrencyAxis}
              fill={CHART_INK.label}
              fontSize={11}
            />
          </Bar>
          <Bar dataKey="simulated" name="If you do this" fill={SERIES[1]} {...chartAnim()}>
            <LabelList
              dataKey="simulated"
              position="top"
              formatter={formatCurrencyAxis}
              fill={CHART_INK.label}
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

/** Legend and tooltip keep their text in ink tokens; the swatch carries identity. */
function InkLegend({ payload = [] }) {
  return (
    <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-sm text-ink/75">
      {payload.map((entry) => (
        <li key={entry.value} className="flex items-center gap-2">
          <span
            className="block h-2.5 w-2.5 shrink-0"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          {entry.value}
        </li>
      ))}
    </ul>
  );
}

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="border border-kraft bg-sheet px-3 py-2 text-sm text-ink">
      <p className="font-display text-base font-semibold">{label}</p>
      <ul className="mt-1 space-y-1">
        {payload.map((entry) => (
          <li key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="block h-2.5 w-2.5 shrink-0"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-ink/75">{entry.name}</span>
            <span className="ml-auto pl-5 font-medium tabular-nums">
              {formatCurrencyExact(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonTable({ comparison }) {
  return (
    <Panel title="Every figure, side by side" className="mb-6" bodyClassName="">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem] text-sm">
          <thead>
            <tr className="border-b border-kraft">
              <th scope="col" className="px-5 py-3 text-left font-medium text-ink/70">
                Figure
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium text-ink/70">
                Now
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium text-ink/70">
                If you do this
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium text-ink/70">
                Change
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium text-ink/70">
                Change %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kraft">
            {comparison.map((row) => {
              const { label, kind } = metricMeta(row);
              const money = kind === 'money';

              return (
                <tr key={row.key}>
                  <th scope="row" className="px-5 py-2.5 text-left font-medium text-ink">
                    {label}
                  </th>
                  <td className="px-5 py-2.5 text-right tabular-nums text-ink/75">
                    {formatMetric(row.baseline, kind)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-ink">
                    {formatMetric(row.simulated, kind)}
                  </td>
                  <td
                    className={`px-5 py-2.5 text-right font-medium tabular-nums ${
                      money && row.change < 0 ? 'text-loss' : 'text-ink'
                    }`}
                  >
                    {formatDelta(row.change, kind)}
                  </td>
                  <td
                    className={`px-5 py-2.5 text-right tabular-nums ${
                      money && row.pct_change < 0 ? 'text-loss' : 'text-ink/75'
                    }`}
                  >
                    {formatSignedPercent(row.pct_change)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Explanation({ data }) {
  const top = data.feature_importance[0]?.importance || 1;

  return (
    <>
      <Panel
        title="Which columns move revenue"
        description={`Read from ${formatNumber(data.n_samples)} rows across ${formatNumber(
          data.n_features,
        )} columns. A longer bar means that column swings ${data.target} more.`}
        className="mb-6"
      >
        {data.feature_importance.length === 0 ? (
          <p className="text-ink/75">
            No column scored high enough to rank.{' '}
            <Link to="/upload" className={FIX_LINK}>
              Open your files
            </Link>
            , set more of this one&rsquo;s column meanings, and run this again.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {data.feature_importance.map((f) => (
              <li key={f.feature} className="flex items-center gap-3">
                <span
                  className="w-24 shrink-0 truncate text-right text-sm text-ink/75 sm:w-44"
                  title={f.feature}
                >
                  {f.feature}
                </span>
                <span className="block h-4 flex-1 bg-kraft/40" aria-hidden="true">
                  <span
                    className="block h-full"
                    style={{
                      width: `${Math.max(5, (f.importance / top) * 100)}%`,
                      backgroundColor: SERIES[0],
                    }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums text-ink">
                  {f.importance.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {data.bar_plot && (
        <Panel title="The same ranking, as the model drew it" className="mb-6">
          <img
            src={`data:image/png;base64,${data.bar_plot}`}
            alt="Bar plot ranking each column by its average effect on revenue"
            className="w-full"
          />
        </Panel>
      )}

      {data.summary_plot && (
        <Panel
          title="Which way each column pushes"
          description="Each dot is one row. Dots to the right pushed revenue up, dots to the left pushed it down."
          className="mb-6"
        >
          <img
            src={`data:image/png;base64,${data.summary_plot}`}
            alt="Summary plot showing how each column pushes revenue up or down across rows"
            className="w-full"
          />
        </Panel>
      )}
    </>
  );
}

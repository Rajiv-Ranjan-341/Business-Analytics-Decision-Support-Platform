import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import Panel from '../components/Shared/Panel';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import { getDiagnosis } from '../api/client';
import {
  formatCurrencyAxis,
  formatCurrencyExact,
  formatPercent,
  formatSignedPercent,
  CHART_INK,
} from '../lib/format';
import { chartAnim } from '../lib/motion';

/**
 * Contributions are signed, so this is the one genuinely diverging encoding in the
 * app: money lost wears loss red, money gained wears plain ink, and every bar grows
 * from an explicit zero rule. The ink pole is read off the token layer rather than
 * hardcoded, because CHART_INK carries a loss colour but no ink one.
 */
const INK = 'var(--color-ink)';
const MAX_BARS = 8;
const ROW_HEIGHT = 34;
const VALUE_AXIS_BAND = 36;

export default function DiagnosisPage() {
  const [datasetId, setDatasetId] = useState(null);
  // The reply is stored against the dataset it belongs to, so "still loading" is
  // derived during render instead of being flipped from inside the effect.
  const [result, setResult] = useState({ id: null, data: null, error: null });

  useEffect(() => {
    if (!datasetId) return undefined;

    // Switching datasets mid-request used to let the slower reply win and paint the
    // wrong file's numbers. The stale run is ignored instead.
    let current = true;

    getDiagnosis(datasetId)
      .then((res) => {
        if (current) setResult({ id: datasetId, data: res, error: null });
      })
      .catch((err) => {
        if (!current) return;
        setResult({
          id: datasetId,
          data: null,
          error: err.response?.data?.detail || 'That dataset could not be diagnosed.',
        });
      });

    return () => {
      current = false;
    };
  }, [datasetId]);

  // Clearing or changing the select used to leave the previous dataset's figures on
  // screen underneath the prompt; a reply only counts for the dataset it was asked for.
  const settled = Boolean(datasetId) && result.id === datasetId;
  const data = settled ? result.data : null;
  const error = settled ? result.error : null;
  const loading = Boolean(datasetId) && !settled;
  const dimensions = data?.dimensions || [];

  return (
    <div>
      <PageHeader
        title="Diagnosis"
        description="Where the last month’s change landed. This page shows what changed, not why it changed: the contributions below are arithmetic, not causes."
      />

      <DatasetSelector selectedId={datasetId} onSelect={setDatasetId} />

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 border-l-[3px] border-warn bg-sheet py-3 pr-4 pl-3.5 text-sm text-ink"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          <div className="max-w-[70ch]">
            <p className="font-semibold">Warning: the diagnosis could not be run</p>
            <p className="mt-0.5 text-ink/85">{error}</p>
            <p className="mt-1 text-ink/75">
              This page needs one column set as the date and at least two months of sales in the
              file.{' '}
              <Link
                to="/upload"
                className="font-medium text-ink underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Open your files
              </Link>
              , open this one, and set its column meanings, then choose the file here again.
            </p>
          </div>
        </div>
      )}

      {!datasetId && (
        <Panel title="Nothing to compare yet">
          <p className="max-w-[62ch] text-sm text-ink/75">
            Point this page at a dataset above. It takes the last two months in the file, works out
            how much the total moved between them, and ranks the categories, regions, customers and
            products that account for the move.
          </p>
        </Panel>
      )}

      {loading && <LoadingSpinner message="Comparing the last two months" />}

      {data && (
        <div className="space-y-4">
          <MonthChange overview={data.overview} />

          {dimensions.length === 0 ? (
            <Panel title="Nothing to break the change down by">
              <p className="max-w-[62ch] text-sm text-ink/75">
                No column in this file is set as a category, region, customer or product, so the
                change can be measured but not attributed.{' '}
                <Link
                  to="/upload"
                  className="font-medium text-ink underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Open your files
                </Link>
                , set one of those column meanings, and the breakdown fills in here.
              </p>
            </Panel>
          ) : (
            <>
              <TopContributors contributors={data.top_contributors} />
              <div className="grid gap-4 xl:grid-cols-2">
                {dimensions.map((dim) => (
                  <DimensionChart
                    key={dim.dimension}
                    dimension={dim.dimension}
                    contributions={dim.contributions}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The headline move. A fall wears loss red and a down arrow; a rise is plain ink, so
 * the direction is carried by the verb and the arrow as well as the colour.
 */
function MonthChange({ overview }) {
  const change = overview.absolute_change;
  const flat = change === 0;
  const falling = change < 0;
  const Icon = falling ? TrendingDown : TrendingUp;
  const current = monthLabel(overview.current_month);
  const previous = monthLabel(overview.previous_month);
  const verb = flat ? 'held steady' : falling ? 'fell' : 'rose';

  return (
    <Panel
      title={`${previous} to ${current}`}
      description={`How ${overview.metric} moved between the last two months in this file.`}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="text-sm text-ink/75">
            {overview.metric} {verb}
          </p>
          <p
            className={`mt-1 flex items-center gap-2.5 font-display text-4xl font-bold tabular-nums ${
              falling ? 'text-loss' : 'text-ink'
            }`}
          >
            {!flat && <Icon size={28} aria-hidden="true" />}
            {formatCurrencyExact(Math.abs(change))}
          </p>
          <p className={`mt-1.5 text-sm tabular-nums ${falling ? 'text-loss' : 'text-ink/75'}`}>
            {formatSignedPercent(overview.pct_change)} on {previous}
          </p>
        </div>

        <dl className="grid grid-cols-[auto_auto] gap-x-8 gap-y-1.5 text-sm">
          <dt className="text-ink/75">{previous}</dt>
          <dd className="text-right tabular-nums text-ink">
            {formatCurrencyExact(overview.previous_value)}
          </dd>
          <dt className="text-ink/75">{current}</dt>
          <dd className="text-right font-semibold tabular-nums text-ink">
            {formatCurrencyExact(overview.current_value)}
          </dd>
        </dl>
      </div>
    </Panel>
  );
}

/** The cross-dimension ranking, as a table so every figure is readable without a hover. */
function TopContributors({ contributors }) {
  const rows = Array.isArray(contributors) ? contributors : [];
  if (rows.length === 0) return null;

  return (
    <Panel
      title="The biggest movers"
      description="Ranked by how much money each one accounts for. Share of the move says how much of the whole change sits with that line, so a line pulling the other way shows a negative share."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-kraft">
              <th scope="col" className="py-2 pr-4 text-left font-medium text-ink/75">
                What moved
              </th>
              <th scope="col" className="py-2 pr-4 text-left font-medium text-ink/75">
                Grouped by
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                Change
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                On last month
              </th>
              <th scope="col" className="py-2 text-right font-medium text-ink/75">
                Share of the move
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const falling = row.change < 0;
              const Icon = falling ? TrendingDown : TrendingUp;

              return (
                <tr
                  key={`${row.dimension}-${row.value}-${index}`}
                  className="border-b border-kraft last:border-b-0"
                >
                  <td className="py-2.5 pr-4 text-ink">{row.value}</td>
                  <td className="py-2.5 pr-4 text-ink/75">{row.dimension}</td>
                  <td
                    className={`py-2.5 pr-4 text-right font-semibold tabular-nums ${
                      falling ? 'text-loss' : 'text-ink'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={13} aria-hidden="true" />
                      {formatCurrencyExact(row.change)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-ink/85">
                    {formatSignedPercent(row.pct_change)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-ink/85">
                    {formatPercent(row.contribution_pct)}
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

/**
 * One diverging bar chart per dimension: bars grow left and right of an explicit zero
 * rule, sorted by how far each one moved the total regardless of which way it went.
 */
function DimensionChart({ dimension, contributions }) {
  const rows = Array.isArray(contributions)
    ? [...contributions]
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, MAX_BARS)
    : [];

  if (rows.length === 0) return null;

  const domain = valueDomain(rows.map((row) => row.change));
  // Grow the container with the data so the value axis always has its own band and
  // never gets squeezed into a nested scrollbar.
  const height = rows.length * ROW_HEIGHT + VALUE_AXIS_BAND;

  return (
    <Panel
      title={`By ${dimension}`}
      description="Sorted by how far each one moved the total. The upright rule is zero: bars left of it came down on last month, bars right of it went up."
    >
      {/* The sign is doing the colouring, so it gets a key of its own. */}
      <ul className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <li className="flex items-center gap-2 text-sm text-ink/85">
          <span aria-hidden="true" className="inline-block h-2.5 w-4 shrink-0 bg-ink" />
          Up on last month
        </li>
        <li className="flex items-center gap-2 text-sm text-ink/85">
          <span aria-hidden="true" className="inline-block h-2.5 w-4 shrink-0 bg-loss" />
          Down on last month
        </li>
      </ul>

      <div className="tabular-nums">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 0, left: 0 }}
            barCategoryGap="32%"
          >
            <XAxis
              type="number"
              domain={domain}
              tickFormatter={formatCurrencyAxis}
              tick={{ fontSize: 12, fill: CHART_INK.label }}
              tickLine={false}
              tickMargin={8}
              axisLine={{ stroke: CHART_INK.axis }}
            />
            <YAxis
              type="category"
              dataKey="value"
              width={116}
              interval={0}
              tickFormatter={shorten}
              tick={{ fontSize: 12, fill: CHART_INK.label }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: CHART_INK.grid, fillOpacity: 0.6 }}
              content={(props) => <ContributionTooltip {...props} dimension={dimension} />}
            />
            {/* The zero baseline, drawn in ink so it reads as the origin rather than grid. */}
            <ReferenceLine x={0} stroke={INK} strokeWidth={1.5} />
            <Bar
              dataKey="change"
              name="Change on last month"
              barSize={18}
              {...chartAnim()}
            >
              {rows.map((row) => (
                <Cell key={row.value} fill={row.change < 0 ? CHART_INK.loss : INK} />
              ))}
              <LabelList dataKey="change" content={(props) => <BarTipLabel {...props} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function ContributionTooltip({ active, payload, dimension }) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  const falling = row.change < 0;
  const Icon = falling ? TrendingDown : TrendingUp;

  return (
    <div className="max-w-[20rem] border border-kraft bg-sheet px-3 py-2.5">
      <p className="font-display text-base font-semibold text-ink">{row.value}</p>
      <p className="text-xs text-ink/70">{dimension}</p>
      <p
        className={`mt-1.5 flex items-center gap-1.5 text-sm font-semibold tabular-nums ${
          falling ? 'text-loss' : 'text-ink'
        }`}
      >
        <Icon size={13} aria-hidden="true" />
        {formatCurrencyExact(row.change)}
      </p>
      <p className="mt-1 text-sm tabular-nums text-ink/75">
        From {formatCurrencyExact(row.previous)} to {formatCurrencyExact(row.current)}
      </p>
      <p className="mt-0.5 text-sm tabular-nums text-ink/75">
        {formatSignedPercent(row.pct_change)} on last month
      </p>
    </div>
  );
}

/** The value sits just past the tip of its bar, on whichever side the bar grew. */
function BarTipLabel({ x, y, width, height, value }) {
  if (value == null || height == null) return null;

  const left = width < 0 ? x + width : x;
  const right = width < 0 ? x : x + width;
  const negative = value < 0;

  return (
    <text
      x={negative ? left - 8 : right + 8}
      y={y + height / 2}
      textAnchor={negative ? 'end' : 'start'}
      dominantBaseline="central"
      fill={CHART_INK.label}
      fontSize={12}
    >
      {formatCurrencyAxis(value)}
    </text>
  );
}

/** Zero always stays in frame, with room at the live end for the tip labels. */
function valueDomain(values) {
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const span = Math.max(Math.abs(low), Math.abs(high));
  if (span === 0) return [-1, 1];
  const pad = span * 0.28;
  return [low < 0 ? low - pad : 0, high > 0 ? high + pad : 0];
}

/** Axis labels get an ellipsis rather than a clip; the tooltip carries the full name. */
function shorten(value) {
  const text = String(value ?? '');
  return text.length > 16 ? `${text.slice(0, 15)}…` : text;
}

/**
 * The API sends months as 'YYYY-MM'. Building the date from the parts keeps it local:
 * `new Date('2024-03')` is read as UTC midnight, which rolls back to February
 * anywhere west of Greenwich.
 */
function monthLabel(period) {
  const parts = /^(\d{4})-(\d{2})/.exec(String(period ?? ''));
  if (!parts) return String(period ?? '');
  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

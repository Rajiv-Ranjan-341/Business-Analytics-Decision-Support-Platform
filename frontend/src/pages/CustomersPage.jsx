import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScatterChart,
  Scatter,
  ZAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from 'recharts';
import { AlertCircle, Play } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import Panel from '../components/Shared/Panel';
import {
  formatCurrency, formatCurrencyAxis, formatCurrencyExact, formatNumber, formatPercent, SERIES_SAFE, CHART_INK,
} from '../lib/format';
import { runSegmentation } from '../api/client';
import { chartAnim } from '../lib/motion';

/**
 * Scatter and bubble are held to the dataviz checker's ALL-PAIRS test, and only the
 * first three of the five series survive it — ochre and sienna collapse to
 * deuteranopic ΔE 0.3 when points can sit beside each other unordered. So exactly
 * three groups carry colour on this page and everything past the third shares one
 * neutral mark: ink at 45%, read from the theme rather than re-typed as a hex.
 *
 * The neutral is never the only thing carrying a group's identity. Every point names
 * its group in the tooltip, every bar is named on its axis, and the table names all
 * of them, so folding groups together costs no information.
 */
const OTHER_MARK = 'var(--color-ink)';
const OTHER_MARK_OPACITY = 0.45;

/* Most things that stop a run are a column whose meaning was never set, so the
   error ends at the one screen that can fix it rather than leaving a person to
   find it. */
const FIX_LINK =
  'font-medium text-ink underline underline-offset-4 hover:no-underline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

const COLOURED_MARK_OPACITY = 0.85;

const ROW_HEIGHT = 34;
const VALUE_AXIS_BAND = 36;

/**
 * Plain-language gloss for the names the backend assigns. Keyed on the exact string,
 * so a group the backend names something new simply goes without a note rather than
 * printing the wrong one.
 */
const GROUP_NOTES = {
  Champions: 'Bought recently, buy often, and spend the most.',
  'Loyal Customers': 'Bought recently and spend well when they do.',
  'Recent Customers': 'Bought recently, but have not spent much yet.',
  'At Risk (High Value)': 'Spent well and bought often, but not lately.',
  'Needs Attention': 'Used to buy often. They have gone quiet.',
  "Can't Lose Them": 'Big spenders who have not been back in a while.',
  Hibernating: 'Away a long time, and never spent much.',
};

export default function CustomersPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Switching datasets used to leave the previous file's groups on screen, labelled
  // as if they belonged to the newly chosen one.
  function handleSelectDataset(id) {
    setDatasetId(id);
    setResult(null);
    setError(null);
  }

  async function handleSegment() {
    if (!datasetId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await runSegmentation(datasetId);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'The server did not give a reason.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Sort the people who buy from you into groups by how recently they last ordered, how often they come back, and how much they spend."
      />

      <DatasetSelector selectedId={datasetId} onSelect={handleSelectDataset} />

      {datasetId ? (
        <Panel
          className="mb-6"
          title="Group your customers"
          description="Every customer is scored on three things: days since their last order, how many orders they have placed, and what they have spent in total. Customers with similar scores are put in a group together, and the number of groups is chosen for you by whichever split comes out cleanest."
        >
          <button
            type="button"
            onClick={handleSegment}
            disabled={loading}
            className="flex items-center gap-2 bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-ink/70"
          >
            <Play size={14} aria-hidden="true" />
            {loading ? 'Grouping' : 'Group the customers'}
          </button>
        </Panel>
      ) : (
        <Panel title="Nothing to group yet">
          <p className="max-w-[62ch] text-sm text-ink/75">
            Point this page at a dataset above and it will sort that file&rsquo;s customers into
            groups, show you where each one sits, and rank the groups by what they brought in.
          </p>
        </Panel>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 border-l-[3px] border-warn bg-sheet py-3 pr-4 pl-3.5 text-sm text-ink"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          <div className="max-w-[70ch]">
            <p className="font-semibold">Warning: the grouping stopped</p>
            <p className="mt-0.5 text-ink/85">{error}</p>
            <p className="mt-1 text-ink/75">
              Grouping needs one column set as the customer, one as the date and one as your sales
              figures, and at least four separate customers in the file.{' '}
              <Link to="/upload" className={FIX_LINK}>
                Open your files
              </Link>
              , open this one, and set its column meanings, then run the grouping again.
            </p>
          </div>
        </div>
      )}

      {loading && <LoadingSpinner message="Scoring every customer and finding the groups" />}

      {!loading && !error && datasetId && !result && (
        <Panel>
          <p className="max-w-[70ch] text-ink/75">
            Nothing grouped yet. Run it above and this page fills in: how many groups your customers
            fall into, where each customer sits, and which group brings in the most.
          </p>
        </Panel>
      )}

      {result && !loading && <SegmentationResult result={result} />}
    </div>
  );
}

function SegmentationResult({ result }) {
  const { ranked, byCluster } = describeGroups(result.segments);
  const points = Array.isArray(result.scatter_data) ? result.scatter_data : [];

  return (
    <div className="space-y-6">
      <Summary
        summary={result.rfm_summary || {}}
        groupCount={ranked.length || result.n_clusters}
        silhouette={result.silhouette_score}
      />

      <CustomerScatter points={points} ranked={ranked} byCluster={byCluster} />

      <RevenueByGroup ranked={ranked} />

      <GroupTable ranked={ranked} />
    </div>
  );
}

/**
 * Names repeat: two clusters can both profile as "Hibernating". A repeated name is
 * numbered so no two rows, bars or legend entries read identically.
 *
 * Groups are then ranked by what they brought in, and the top three take the three
 * all-pairs-safe colours in fixed order. Ranking here — rather than colouring in the
 * order the API happened to return — is also what keeps a group the same colour in
 * the scatter, the bars and the table.
 */
function describeGroups(segments) {
  const rows = Array.isArray(segments) ? segments : [];

  const nameCounts = new Map();
  rows.forEach((s) => nameCounts.set(s.name, (nameCounts.get(s.name) || 0) + 1));

  const seen = new Map();
  const labelled = rows.map((s) => {
    if ((nameCounts.get(s.name) || 0) < 2) return { ...s, label: s.name };
    const nth = (seen.get(s.name) || 0) + 1;
    seen.set(s.name, nth);
    return { ...s, label: `${s.name} (${nth})` };
  });

  const ranked = [...labelled]
    .sort((a, b) => (b.total_revenue ?? 0) - (a.total_revenue ?? 0))
    .map((s, i) => ({ ...s, color: i < SERIES_SAFE.length ? SERIES_SAFE[i] : null }));

  const byCluster = new Map(ranked.map((s) => [s.cluster_id, s]));

  return { ranked, byCluster };
}

function markFor(group) {
  return group?.color
    ? { fill: group.color, fillOpacity: COLOURED_MARK_OPACITY }
    : { fill: OTHER_MARK, fillOpacity: OTHER_MARK_OPACITY };
}

/** A square chip, cornered like everything else on the page. Decorative: the name always sits beside it. */
function Swatch({ color, className = 'h-2.5 w-2.5' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}${color ? '' : ' bg-ink/45'}`}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

function Summary({ summary, groupCount, silhouette }) {
  const tiles = [
    { label: 'Customers', value: formatNumber(summary.total_customers) },
    { label: 'Groups', value: formatNumber(groupCount) },
    { label: 'How cleanly they split', value: formatScore(silhouette) },
    { label: 'Days since last order', value: formatNumber(summary.avg_recency) },
    { label: 'Orders each', value: formatNumber(summary.avg_frequency) },
    { label: 'Spend each', value: formatCurrency(summary.avg_monetary) },
  ];

  return (
    <Panel
      title="What the grouping found"
      description="Everyone who bought from you in this file. Days, orders and spend are averages across all of them. How cleanly they split runs from 0 to 1: above about 0.5 the groups are genuinely distinct, and near 0 they blur into one another and the split is worth less than it looks."
      bodyClassName="p-0"
    >
      <div className="grid grid-cols-2 gap-px bg-kraft sm:grid-cols-3">
        {tiles.map(({ label, value }) => (
          <div key={label} className="bg-sheet px-4 py-4">
            <p className="text-sm text-ink/70">{label}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '—';
}

function CustomerScatter({ points, ranked, byCluster }) {
  if (points.length === 0 || ranked.length === 0) {
    return (
      <Panel title="Where each customer sits">
        <p className="max-w-[60ch] py-8 text-sm text-ink/75">
          This run returned no customers to plot.{' '}
          <Link to="/upload" className={FIX_LINK}>
            Open your files
          </Link>{' '}
          and check that the column set as the customer holds one name or ID per buyer, then run
          the grouping again.
        </p>
      </Panel>
    );
  }

  const coloured = ranked.filter((g) => g.color);
  const folded = ranked.filter((g) => !g.color);
  const foldedIds = new Set(folded.map((g) => g.cluster_id));
  const otherPoints = points.filter((p) => foldedIds.has(p.cluster));
  const otherCount = folded.reduce((sum, g) => sum + (g.count ?? 0), 0);

  return (
    <Panel
      title="Where each customer sits"
      description="One dot per customer: orders along the bottom, total spend up the side. Your best buyers sit top right. Hover any dot for who it is and which group they landed in."
    >
      <dl className="mb-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        {coloured.map((group) => (
          <div key={group.cluster_id} className="flex items-start gap-2.5">
            <Swatch color={group.color} className="mt-1.5 h-2.5 w-2.5" />
            <div>
              <dt className="text-sm font-semibold text-ink">{group.label}</dt>
              <dd className="text-sm text-ink/75">
                <span className="tabular-nums">{formatNumber(group.count)}</span> customers,{' '}
                <span className="tabular-nums">{formatPercent(group.pct_of_total)}</span> of the file
                {GROUP_NOTES[group.name] ? ` — ${GROUP_NOTES[group.name]}` : ''}
              </dd>
            </div>
          </div>
        ))}

        {folded.length > 0 && (
          <div className="flex items-start gap-2.5">
            <Swatch color={null} className="mt-1.5 h-2.5 w-2.5" />
            <div>
              <dt className="text-sm font-semibold text-ink">Every other group</dt>
              <dd className="text-sm text-ink/75">
                <span className="tabular-nums">{formatNumber(otherCount)}</span> customers across{' '}
                {folded.map((g) => g.label).join(', ')}. They share one mark here; the table below
                separates them.
              </dd>
            </div>
          </div>
        )}
      </dl>

      <div className="tabular-nums">
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            {/* Both axes are quantitative here, so the grid rules both ways — quietly. */}
            <CartesianGrid stroke={CHART_INK.grid} />
            <XAxis
              type="number"
              dataKey="frequency"
              name="Orders"
              tick={{ fontSize: 12, fill: CHART_INK.label }}
              tickLine={false}
              tickMargin={8}
              axisLine={{ stroke: CHART_INK.axis }}
            />
            <YAxis
              type="number"
              dataKey="monetary"
              name="Spend"
              width={72}
              tickFormatter={formatCurrencyAxis}
              tick={{ fontSize: 12, fill: CHART_INK.label }}
              tickLine={false}
              axisLine={false}
            />
            {/* Fixed mark area, so a dot never shrinks below the 8px floor. */}
            <ZAxis range={[72, 72]} />
            <Tooltip
              cursor={{ stroke: CHART_INK.axis, strokeWidth: 1, strokeDasharray: '3 3' }}
              content={(props) => <CustomerTooltip {...props} byCluster={byCluster} />}
            />
            {coloured.map((group) => (
              <Scatter
                key={group.cluster_id}
                name={group.label}
                data={points.filter((p) => p.cluster === group.cluster_id)}
                stroke={CHART_INK.surface}
                strokeWidth={1}
                {...chartAnim()}
                {...markFor(group)}
              />
            ))}
            {otherPoints.length > 0 && (
              <Scatter
                name="Every other group"
                data={otherPoints}
                {...chartAnim()}
                {...markFor(null)}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function CustomerTooltip({ active, payload, byCluster }) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  if (!row) return null;

  const group = byCluster.get(row.cluster);

  return (
    <div className="max-w-[20rem] border border-kraft bg-sheet px-3 py-2.5">
      <p className="font-display text-base font-semibold text-ink">{row.customer}</p>
      <p className="mt-0.5 flex items-center gap-2 text-sm text-ink/75">
        <Swatch color={group?.color} className="h-2 w-2" />
        {group?.label || row.segment_name}
      </p>
      <dl className="mt-1.5 space-y-0.5 text-sm text-ink">
        <div className="flex gap-2">
          <dt className="text-ink/75">Spent</dt>
          <dd className="font-semibold tabular-nums">{formatCurrencyExact(row.monetary)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink/75">Orders</dt>
          <dd className="tabular-nums">{formatNumber(row.frequency)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink/75">Last order</dt>
          <dd className="tabular-nums">{formatNumber(row.recency)} days ago</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * One measure, so the bars answer "which group is biggest" with length from a shared
 * baseline. Colour here repeats the scatter's key rather than re-encoding size: a
 * group keeps the same mark everywhere it appears, and the folded groups keep the
 * neutral. Every bar is named on its own axis, so the colour carries nothing alone.
 */
function RevenueByGroup({ ranked }) {
  if (ranked.length === 0) {
    return (
      <Panel title="Sold by group">
        <p className="max-w-[60ch] py-8 text-sm text-ink/75">
          This run returned no groups to rank. Run the grouping again once the file has at least
          four separate customers in it.
        </p>
      </Panel>
    );
  }

  const height = ranked.length * ROW_HEIGHT + VALUE_AXIS_BAND;

  return (
    <Panel title="Sold by group" description="Groups ranked by what they have brought in so far.">
      <div className="tabular-nums">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={ranked}
            layout="vertical"
            margin={{ top: 4, right: 76, bottom: 0, left: 0 }}
            barCategoryGap="30%"
          >
            <XAxis
              type="number"
              tickFormatter={formatCurrencyAxis}
              tick={{ fontSize: 12, fill: CHART_INK.label }}
              tickLine={false}
              tickMargin={8}
              axisLine={{ stroke: CHART_INK.axis }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={128}
              interval={0}
              tickFormatter={shorten}
              tick={{ fontSize: 12, fill: CHART_INK.label }}
              tickLine={false}
              axisLine={{ stroke: CHART_INK.axis }}
            />
            <Tooltip
              cursor={{ fill: CHART_INK.grid, fillOpacity: 0.6 }}
              content={(props) => <GroupTooltip {...props} />}
            />
            <Bar dataKey="total_revenue" name="Sold" barSize={20} {...chartAnim()}>
              {ranked.map((group) => (
                <Cell key={group.cluster_id} {...markFor(group)} />
              ))}
              <LabelList
                dataKey="total_revenue"
                position="right"
                offset={8}
                formatter={formatCurrencyAxis}
                fill={CHART_INK.label}
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

/** Axis labels get an ellipsis rather than a clip; the tooltip carries the full name. */
function shorten(value) {
  const text = String(value ?? '');
  return text.length > 18 ? `${text.slice(0, 17)}…` : text;
}

function GroupTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  if (!row) return null;

  return (
    <div className="max-w-[20rem] border border-kraft bg-sheet px-3 py-2.5">
      <p className="font-display text-base font-semibold text-ink">{row.label}</p>
      <p className="mt-1 flex items-center gap-2 text-sm">
        <span className="font-semibold tabular-nums text-ink">
          {formatCurrencyExact(row.total_revenue)}
        </span>
        <span className="text-ink/70">sold</span>
      </p>
      <p className="mt-0.5 text-sm text-ink/75">
        <span className="tabular-nums">{formatNumber(row.count)}</span> customers,{' '}
        <span className="tabular-nums">{formatCurrencyExact(row.avg_monetary)}</span> each on average
      </p>
    </div>
  );
}

function GroupTable({ ranked }) {
  if (ranked.length === 0) return null;

  const totalCustomers = ranked.reduce((sum, g) => sum + (g.count ?? 0), 0);
  const totalRevenue = ranked.reduce((sum, g) => sum + (g.total_revenue ?? 0), 0);

  return (
    <Panel
      title="Group by group"
      description="The same groups as figures. Days is how long since that group last bought, on average."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">
            Every customer group with its size, buying pattern and takings
          </caption>
          <thead>
            <tr className="border-b border-kraft">
              <th scope="col" className="py-2 pr-4 text-left font-medium text-ink/75">
                Group
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                Customers
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                Share
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                Days since last order
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                Orders each
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium text-ink/75">
                Spend each
              </th>
              <th scope="col" className="py-2 text-right font-medium text-ink/75">
                Sold
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((group) => (
              <tr key={group.cluster_id} className="border-b border-kraft">
                <th scope="row" className="py-2.5 pr-4 text-left font-medium text-ink">
                  <span className="flex items-center gap-2">
                    <Swatch color={group.color} />
                    {group.label}
                  </span>
                  {GROUP_NOTES[group.name] && (
                    <span className="mt-0.5 block max-w-[34ch] text-xs font-normal text-ink/75">
                      {GROUP_NOTES[group.name]}
                    </span>
                  )}
                </th>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                  {formatNumber(group.count)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink/75">
                  {formatPercent(group.pct_of_total)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink/75">
                  {formatNumber(group.avg_recency)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink/75">
                  {formatNumber(group.avg_frequency)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                  {formatCurrencyExact(group.avg_monetary)}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums text-ink">
                  {formatCurrencyExact(group.total_revenue)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="py-2.5 pr-4 text-left font-semibold text-ink">
                All customers
              </th>
              <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-ink">
                {formatNumber(totalCustomers)}
              </td>
              <td className="py-2.5 pr-4 text-right text-ink/75">—</td>
              <td className="py-2.5 pr-4 text-right text-ink/75">—</td>
              <td className="py-2.5 pr-4 text-right text-ink/75">—</td>
              <td className="py-2.5 pr-4 text-right text-ink/75">—</td>
              <td className="py-2.5 text-right font-semibold tabular-nums text-ink">
                {formatCurrencyExact(totalRevenue)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

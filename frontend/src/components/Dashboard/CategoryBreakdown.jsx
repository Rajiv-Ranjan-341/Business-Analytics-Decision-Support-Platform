import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import Panel from '../Shared/Panel';
import { formatCurrencyAxis, formatCurrencyExact, SERIES, CHART_INK } from '../../lib/format';
import { chartAnim } from '../../lib/motion';

/**
 * Both panels answer "which of these is biggest", which is a magnitude question, so
 * each is a horizontal bar sorted largest first rather than a pie — lengths from a
 * shared baseline are readable at a glance, pie slices are not.
 *
 * Both panels plot the same measure — revenue, which this app calls "Sold" — so both
 * take the SAME colour, SERIES[0]. The line chart on this page already teaches
 * "SERIES[0] is Sold, SERIES[1] is Kept"; giving the region bars SERIES[1] would make
 * one hue mean two different measures on one screen. Within each chart colour encodes
 * nothing anyway: there is one series and bar length carries the magnitude.
 */
const ROW_HEIGHT = 34;
const MIN_PLOT_HEIGHT = 96;

export default function CategoryBreakdown({ categoryData, regionData }) {
  return (
    // Two columns only once there is room for a 112px name axis plus readable bars;
    // below that the panels stack full width.
    <div className="grid gap-4 xl:grid-cols-2">
      <Breakdown
        title="Sold by category"
        description="Categories ranked by what they took in."
        data={categoryData}
        nameKey="category"
        color={SERIES[0]}
        emptyRows="Nothing to rank yet. This file's category column has no sales against it."
        noData="No category ranking could be read for this file. Check its category column on the upload page and the ranking fills in here."
      />
      <Breakdown
        title="Sold by region"
        description="Regions ranked by what they took in."
        data={regionData}
        nameKey="region"
        color={SERIES[0]}
        emptyRows="Nothing to rank yet. This file's region column has no sales against it."
        noData="No region ranking could be read for this file. Check its region column on the upload page and the ranking fills in here."
      />
    </div>
  );
}

function Breakdown({ title, description, data, nameKey, color, emptyRows, noData }) {
  const rows = Array.isArray(data) ? [...data].sort((a, b) => b.value - a.value) : [];

  if (rows.length === 0) {
    // An array means the breakdown was read and simply had nothing in it; null means the
    // request never came back, usually because the column is not mapped. Telling someone
    // to go map a column they already mapped sends them to the upload page for nothing.
    const message = Array.isArray(data) ? emptyRows : noData;
    return (
      <Panel title={title}>
        <p className="max-w-[60ch] py-8 text-sm text-ink/75">{message}</p>
      </Panel>
    );
  }

  // Grow the container with the data so long rankings stay one row per name instead of
  // being squeezed into a nested scrollbar.
  const height = Math.max(MIN_PLOT_HEIGHT, rows.length * ROW_HEIGHT);

  return (
    <Panel title={title} description={description}>
      <div className="tabular-nums">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 76, bottom: 0, left: 0 }}
            barCategoryGap="30%"
          >
            {/*
              Every bar is labelled with its own figure at the tip, so a second
              quantitative axis would print the same numbers twice. The axis stays for
              the scale the bars are measured against, but is not drawn.
            */}
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey={nameKey}
              width={112}
              interval={0}
              tickFormatter={shorten}
              tick={{ fontSize: 12, fill: CHART_INK.label }}
              tickLine={false}
              axisLine={{ stroke: CHART_INK.axis }}
            />
            <Tooltip
              cursor={{ fill: CHART_INK.grid, fillOpacity: 0.6 }}
              content={(props) => <BreakdownTooltip {...props} nameKey={nameKey} />}
            />
            <Bar dataKey="value" name="Sold" fill={color} barSize={20} {...chartAnim()}>
              <LabelList
                dataKey="value"
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
  return text.length > 16 ? `${text.slice(0, 15)}…` : text;
}

function BreakdownTooltip({ active, payload, nameKey }) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  if (!row) return null;

  return (
    <div className="max-w-[18rem] border border-kraft bg-sheet px-3 py-2.5">
      <p className="font-display text-base font-semibold text-ink">{row[nameKey]}</p>
      <p className="mt-1 flex items-center gap-2 text-sm">
        <span className="font-semibold tabular-nums text-ink">{formatCurrencyExact(row.value)}</span>
        <span className="text-ink/70">sold</span>
      </p>
    </div>
  );
}

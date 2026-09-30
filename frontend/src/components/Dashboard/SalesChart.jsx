import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Panel from '../Shared/Panel';
import { formatCurrencyAxis, formatCurrencyExact, SERIES, CHART_INK } from '../../lib/format';
import { chartAnim } from '../../lib/motion';

/**
 * Revenue takes series 1 and profit takes series 2, assigned in fixed order. A file
 * with no profit column drops the second line without repainting the first, so a
 * reader who learned "sold is blue" is never contradicted.
 */
const SOLD = { key: 'revenue', label: 'Sold', color: SERIES[0] };
const KEPT = { key: 'profit', label: 'Kept', color: SERIES[1] };

/**
 * The API sends months as 'YYYY-MM-DD'. `new Date()` reads that as UTC midnight, so
 * anywhere west of Greenwich it rolls back a day and the label prints the previous
 * month. Building the date from the parts keeps it local and keeps the month right.
 */
function parseMonth(value) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (parts) return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function shortMonth(value) {
  const date = parseMonth(value);
  return date ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : String(value);
}

function longMonth(value) {
  const date = parseMonth(value);
  return date ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : String(value);
}

export default function SalesChart({ data, title }) {
  const rows = Array.isArray(data) ? data : [];

  if (rows.length === 0) {
    return (
      <Panel title={title || 'Sold and kept by month'}>
        <p className="max-w-[60ch] py-8 text-sm text-ink/75">
          This file has no dated sales to plot. Map a date column on the upload page and the
          month-by-month trend fills in here.
        </p>
      </Panel>
    );
  }

  const hasProfit = rows.some((row) => row.profit != null);
  const series = hasProfit ? [SOLD, KEPT] : [SOLD];
  const heading = title || (hasProfit ? 'Sold and kept by month' : 'Sold by month');

  return (
    <Panel
      title={heading}
      description={
        hasProfit
          ? 'What each month took in, and what was left after cost. Both are money, so both sit on one scale.'
          : 'What each month took in.'
      }
    >
      {/* Two series always carry a legend; one series is named by the panel title. */}
      {series.length > 1 && (
        <ul className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          {series.map((line) => (
            <li key={line.key} className="flex items-center gap-2 text-sm text-ink/85">
              <span
                aria-hidden="true"
                className="inline-block h-0.5 w-5 shrink-0"
                style={{ backgroundColor: line.color }}
              />
              {line.label}
            </li>
          ))}
        </ul>
      )}

      <div className="tabular-nums">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_INK.grid} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortMonth}
              tick={{ fontSize: 12, fill: CHART_INK.label }}
              tickLine={false}
              tickMargin={8}
              axisLine={{ stroke: CHART_INK.axis }}
              minTickGap={12}
            />
            <YAxis
              width={64}
              tickFormatter={formatCurrencyAxis}
              tick={{ fontSize: 12, fill: CHART_INK.label }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: CHART_INK.axis, strokeWidth: 1 }}
              content={(props) => <TrendTooltip {...props} series={series} />}
            />
            {series.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, fill: line.color, stroke: CHART_INK.surface, strokeWidth: 2 }}
                activeDot={{ r: 5, fill: line.color, stroke: CHART_INK.surface, strokeWidth: 2 }}
                {...chartAnim()}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

/**
 * One readout for every series at the hovered month, so the pointer never has to land
 * on a 2px line to get a number. The value leads and the series name follows.
 */
function TrendTooltip({ active, payload, label, series }) {
  if (!active || !payload || payload.length === 0) return null;

  const values = new Map(payload.map((entry) => [entry.dataKey, entry.value]));

  return (
    <div className="border border-kraft bg-sheet px-3 py-2.5">
      <p className="font-display text-base font-semibold text-ink">{longMonth(label)}</p>
      <ul className="mt-1.5 space-y-1">
        {series.map((line) => (
          <li key={line.key} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-3.5 shrink-0"
              style={{ backgroundColor: line.color }}
            />
            <span className="font-semibold tabular-nums text-ink">
              {formatCurrencyExact(values.get(line.key))}
            </span>
            <span className="text-ink/70">{line.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

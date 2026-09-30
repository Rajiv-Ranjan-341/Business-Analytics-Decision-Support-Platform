import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, BarChart, Bar, Legend,
} from 'recharts';
import PageHeader from '../components/Shared/PageHeader';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import Panel from '../components/Shared/Panel';
import { getProductProfitability } from '../api/client';
import {
  formatCurrencyExact,
  formatCurrencyAxis,
  formatPercent,
  SERIES,
  CHART_INK,
} from '../lib/format';
import { chartAnim } from '../lib/motion';
import Figure from '../components/Shared/Figure';

/**
 * The scatter groups products by margin health. Three colours only: under the
 * all-pairs test that is all the palette separates safely, and each one is named
 * in the legend so the meaning never rests on colour alone.
 */
const HEALTHY = SERIES[0];
const THIN = CHART_INK.warn;
const LOSING = CHART_INK.loss;

/* Most things that stop a page are a column whose meaning was never set, so
   every error here ends at the one screen that can fix it rather than leaving a
   person to find it. */
const FIX_LINK =
  'font-medium text-ink underline underline-offset-4 hover:no-underline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

function groupOf(marginPct) {
  if (marginPct < 0) return { color: LOSING, label: 'Lost money' };
  if (marginPct < 5) return { color: THIN, label: 'Thin margin' };
  return { color: HEALTHY, label: 'Earning' };
}

export default function ProductsPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!datasetId) return;
    setLoading(true);
    setError(null);
    getProductProfitability(datasetId)
      .then(setData)
      .catch((err) => setError(err.response?.data?.detail || 'Could not read this dataset'))
      .finally(() => setLoading(false));
  }, [datasetId]);

  return (
    <div>
      <PageHeader
        title="Products"
        description="What every product actually earned, not what it sold for. Selling a lot and earning nothing is the thing this page is built to catch."
      />
      <DatasetSelector selectedId={datasetId} onSelect={setDatasetId} />

      {!datasetId && (
        <Panel title="Nothing to show yet">
          <p className="max-w-[70ch] text-ink/85">
            Choose a dataset above and this page ranks every product by what you kept, flags the
            ones losing money, and shows which of your best sellers are running on a margin too
            thin to matter.
          </p>
        </Panel>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 border-l-[3px] border-loss bg-sheet py-3 pr-4 pl-3.5 text-sm text-ink"
        >
          <p className="font-medium text-loss">This dataset could not be read</p>
          <p className="mt-0.5 max-w-[70ch] text-ink/85">{error}</p>
          <p className="mt-1 max-w-[70ch] text-ink/75">
            <Link to="/upload" className={FIX_LINK}>
              Open your files
            </Link>
             to check this one's column meanings.
          </p>
        </div>
      )}

      {loading && <LoadingSpinner message="Working out what each product earned" />}

      {data && !loading && (
        <>
          <Summary summary={data.summary} />
          <Tags tags={data.tags} />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MarginScatter scatter={data.scatter} />
            <TopProducts products={data.products.slice(0, 10)} />
          </div>

          <ProductTable products={data.products} />
        </>
      )}
    </div>
  );
}

function Summary({ summary }) {
  const cells = [
    { label: 'Products', value: summary.total_products, format: 'number' },
    { label: 'Sold', value: summary.total_revenue, format: 'currency' },
    summary.total_profit != null && { label: 'Kept', value: summary.total_profit, format: 'currency' },
    summary.avg_margin_pct != null && {
      label: 'Margin', value: summary.avg_margin_pct, format: 'percent',
    },
    summary.loss_making_products != null && {
      label: 'Losing money',
      value: summary.loss_making_products,
      format: 'number',
      bad: summary.loss_making_products > 0,
    },
  ].filter(Boolean);

  return (
    <div className="paper-feed mb-6 grid grid-cols-2 gap-px border border-kraft bg-kraft md:grid-cols-5">
      {cells.map(({ label, value, format, bad }) => (
        <div key={label} className="bg-sheet px-4 py-4">
          <p className="text-sm text-ink/70">{label}</p>
          <p className={`mt-1 font-display text-3xl font-bold tabular-nums ${bad ? 'text-loss' : 'text-ink'}`}>
            <Figure value={value} format={format} />
          </p>
        </div>
      ))}
    </div>
  );
}

function Tags({ tags }) {
  const groups = [
    { key: 'loss_making', label: 'Losing money', tone: 'loss' },
    { key: 'high_revenue_low_margin', label: 'Selling well on a thin margin', tone: 'warn' },
    { key: 'high_margin', label: 'Earning well, over 30% margin', tone: 'ink' },
    { key: 'top_sellers', label: 'Biggest sellers by revenue', tone: 'sticker' },
  ];

  const visible = groups.filter((g) => (tags[g.key] || []).length > 0);
  if (!visible.length) return null;

  return (
    <div className="paper-feed grid grid-cols-1 gap-px border border-kraft bg-kraft md:grid-cols-2" style={{ "--feed-delay": "90ms" }}>
      {visible.map(({ key, label, tone }) => {
        const items = tags[key] || [];
        const extra = items.length > 3 ? items.length - 3 : 0;
        return (
          <div key={key} className="bg-sheet px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <Marker tone={tone} />
              <p className="font-display text-lg font-semibold text-ink">{label}</p>
              <span className="text-sm text-ink/70 tabular-nums">{items.length}</span>
            </div>
            <p className="mt-1 text-sm text-ink/85">
              {items.slice(0, 3).join(', ')}
              {extra > 0 && ` and ${extra} more`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** A small swatch that names its own meaning through the label beside it. */
function Marker({ tone }) {
  const tones = {
    loss: 'bg-loss',
    warn: 'bg-warn',
    ink: 'bg-ink',
    sticker: 'bg-sticker border border-ink/25',
  };
  return <span className={`h-3 w-3 shrink-0 ${tones[tone]}`} aria-hidden="true" />;
}

function ChartTooltip({ active, payload, label, rows }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="border border-kraft bg-sheet px-3 py-2 text-sm text-ink shadow-none">
      {label != null && <p className="mb-1 font-medium">{label}</p>}
      {rows(payload).map((r) => (
        <p key={r.key} className="flex items-baseline justify-between gap-4">
          <span className="text-ink/70">{r.key}</span>
          <span className="font-medium tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

const AXIS_TICK = { fontSize: 11, fill: CHART_INK.label };

function MarginScatter({ scatter }) {
  if (!scatter || scatter.length === 0) return null;

  const groups = [
    { label: 'Lost money', color: LOSING },
    { label: 'Thin margin', color: THIN },
    { label: 'Earning', color: HEALTHY },
  ];

  return (
    <Panel
      title="What each product sold against what it kept"
      description="Anything below the zero line cost you money to sell."
    >
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={CHART_INK.grid} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="revenue"
            name="Sold"
            tick={AXIS_TICK}
            stroke={CHART_INK.axis}
            tickFormatter={formatCurrencyAxis}
          />
          <YAxis
            type="number"
            dataKey="margin_pct"
            name="Margin"
            tick={AXIS_TICK}
            stroke={CHART_INK.axis}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: CHART_INK.axis, strokeDasharray: '3 3' }}
            content={
              <ChartTooltip
                rows={(payload) => {
                  const p = payload[0]?.payload || {};
                  return [
                    { key: 'Product', value: p.product },
                    { key: 'Sold', value: formatCurrencyExact(p.revenue) },
                    { key: 'Kept', value: formatCurrencyExact(p.profit) },
                    { key: 'Margin', value: formatPercent(p.margin_pct) },
                  ];
                }}
              />
            }
          />
          <Scatter data={scatter} name="Products" {...chartAnim()}>
            {scatter.map((p, i) => (
              <Cell key={i} fill={groupOf(p.margin_pct).color} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {groups.map((g) => (
          <li key={g.label} className="flex items-center gap-2 text-sm text-ink/85">
            <span className="h-3 w-3 shrink-0" style={{ backgroundColor: g.color }} aria-hidden="true" />
            {g.label}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function TopProducts({ products }) {
  const data = products.map((p) => ({
    name: p.product.length > 26 ? `${p.product.slice(0, 26)}…` : p.product,
    sold: p.revenue,
    kept: p.profit || 0,
  }));

  return (
    <Panel title="The ten biggest sellers" description="Sold against kept, for the top ten by revenue.">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={CHART_INK.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} stroke={CHART_INK.axis} tickFormatter={formatCurrencyAxis} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART_INK.label }} stroke={CHART_INK.axis} width={172} />
          <Tooltip
            cursor={{ fill: 'rgba(46,36,26,0.06)' }}
            content={
              <ChartTooltip
                rows={(payload) =>
                  payload.map((entry) => ({
                    key: entry.name,
                    value: formatCurrencyExact(entry.value),
                  }))
                }
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: 13, color: CHART_INK.label, paddingTop: 8 }} />
          <Bar dataKey="sold" name="Sold" fill={SERIES[0]} barSize={9} {...chartAnim()} />
          <Bar dataKey="kept" name="Kept" fill={SERIES[1]} barSize={9} {...chartAnim(120)} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

function ProductTable({ products }) {
  return (
    <Panel
      title="Every product"
      description="Sorted by what it sold for. The margin column is where the surprises are."
      className="mt-6"
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <caption className="sr-only">
            Every product with what it sold for, what it kept, its margin, units sold and share of revenue.
          </caption>
          <thead>
            <tr className="border-b border-kraft text-ink/70">
              <th scope="col" className="px-4 py-2.5 text-left font-medium">Product</th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">Category</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Sold</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Kept</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Margin</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Units</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const losing = p.profit != null && p.profit < 0;
              return (
                <tr key={p.product} className="border-b border-kraft/60 last:border-b-0">
                  <td className="max-w-[16rem] truncate px-4 py-2.5 text-ink">{p.product}</td>
                  <td className="px-4 py-2.5 text-ink/70">{p.category || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                    {formatCurrencyExact(p.revenue)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${losing ? 'text-loss' : 'text-ink'}`}>
                    {p.profit != null ? formatCurrencyExact(p.profit) : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${p.margin_pct != null && p.margin_pct < 0 ? 'text-loss' : 'text-ink'}`}>
                    {p.margin_pct != null ? formatPercent(p.margin_pct) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink">{p.units_sold ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink/70">
                    {formatPercent(p.revenue_share_pct)}
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

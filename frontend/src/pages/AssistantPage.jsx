import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import Panel from '../components/Shared/Panel';
import {
  getColumnMappings,
  getDashboardKpis,
  getDiagnosis,
  getProductProfitability,
} from '../api/client';
import {
  formatCurrency,
  formatCurrencyExact,
  formatNumber,
  formatPercent,
  formatSignedPercent,
} from '../lib/format';

/**
 * The briefing is composed, not generated. Every sentence below is a fixed
 * template with figures from the existing dashboard, products and diagnosis
 * endpoints dropped into it. No model writes prose here, and a sentence whose
 * figure is missing from the file is left out rather than guessed at.
 */

const LINK =
  'font-medium text-ink underline underline-offset-4 hover:no-underline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

const TH_TEXT = 'border-b border-kraft pb-2 pr-4 text-left text-sm font-medium text-ink/70';
const TH_NUM = 'border-b border-kraft pb-2 pl-4 text-right text-sm font-medium text-ink/70';
// Base cell rules only: every cell appends its own weight and ink so no two
// conflicting utilities ever land on the same element.
const TD_TEXT = 'border-b border-kraft py-2.5 pr-4 text-left text-sm';
const TD_NUM = 'border-b border-kraft py-2.5 pl-4 text-right text-sm tabular-nums';
const TD_ROW_HEAD = `${TD_TEXT} font-medium text-ink`;

/** Plain ink for money that is positive or zero; loss red only when it is negative. */
function moneyTone(value) {
  return value != null && value < 0 ? 'text-loss' : 'text-ink';
}

/**
 * A figure inside a sentence: same weight everywhere, always tabular.
 *
 * Named Stat rather than Figure because components/Shared/Figure.jsx is a
 * different thing entirely — a value that counts up to itself when data lands.
 * Two components called Figure doing unrelated jobs is a trap for whoever reads
 * this next.
 */
function Stat({ children }) {
  return <strong className="font-semibold tabular-nums text-ink">{children}</strong>;
}

function Money({ value }) {
  return (
    <strong className={`font-semibold tabular-nums ${moneyTone(value)}`}>
      {formatCurrency(value)}
    </strong>
  );
}

/**
 * A loss said the way a shop owner says it — "you lost $1,234" — so the sentence
 * carries the sign in its verb and the figure stays positive. Still loss red,
 * because it is still money going the wrong way.
 */
function LossAmount({ value }) {
  return (
    <strong className="font-semibold tabular-nums text-loss">
      {formatCurrency(Math.abs(value))}
    </strong>
  );
}

/** Keyboard users need to be able to reach and scroll a wide table, not just drag it. */
function ScrollableTable({ label, children }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="mt-3 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {children}
    </div>
  );
}

/**
 * A movement. A fall wears loss red and a down arrow, a rise wears plain ink and
 * an up arrow, so the direction never rests on colour alone. The red is reserved
 * for money, so `tone` is passed in rather than assumed from the sign.
 */
function Move({ value, tone, children }) {
  const Icon = value === 0 ? Minus : value < 0 ? TrendingDown : TrendingUp;

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${tone}`}>
      <Icon size={15} aria-hidden="true" />
      {children}
    </span>
  );
}

/** One templated sentence and the page that proves it. */
function Claim({ to, source, children }) {
  return (
    <li className="border-b border-kraft py-4 first:pt-0 last:border-b-0 last:pb-0">
      <p className="text-[1.0625rem] leading-[1.6] text-ink/85">{children}</p>
      <Link to={to} className={`mt-2 inline-block text-sm ${LINK}`}>
        {source}
      </Link>
    </li>
  );
}

function ClaimList({ children }) {
  return <ul>{children}</ul>;
}

const ROLE_WORDS = {
  category: 'Category',
  region: 'Region',
  customer_id: 'Customer',
  product: 'Product',
};

/**
 * Diagnosis reports raw column names; say them the way a shop owner would. Both
 * lookups are own-property checks so a column literally named "constructor" or
 * "toString" falls back to its own name instead of resolving to a built-in.
 */
function dimensionLabel(column, roleByColumn) {
  const role = Object.prototype.hasOwnProperty.call(roleByColumn, column)
    ? roleByColumn[column]
    : null;
  return (role && Object.prototype.hasOwnProperty.call(ROLE_WORDS, role) && ROLE_WORDS[role]) || column;
}

function formatDay(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMonth(period) {
  if (!period) return null;
  const [y, m] = String(period).split('-').map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/* ---------------------------------------------------------------- sections */

function headlineClaims(kpis) {
  const claims = [];
  if (!kpis) return claims;

  if (kpis.total_revenue != null) {
    claims.push(
      <Claim key="sold" to="/dashboard" source="See Sold and Orders on the dashboard">
        This file sold <Money value={kpis.total_revenue} />
        {kpis.total_orders != null ? (
          <>
            {' '}
            across <Stat>{formatNumber(kpis.total_orders)}</Stat> orders
          </>
        ) : null}
        .
      </Claim>
    );
  }

  if (kpis.total_profit != null) {
    claims.push(
      <Claim key="kept" to="/dashboard" source="See Kept and Margin on the dashboard">
        {kpis.total_profit < 0 ? (
          <>
            You lost <LossAmount value={kpis.total_profit} /> on that
          </>
        ) : (
          <>
            You kept <Money value={kpis.total_profit} /> of that
          </>
        )}
        {kpis.profit_margin != null ? (
          <>
            , a margin of <Stat>{formatPercent(kpis.profit_margin)}</Stat>.
          </>
        ) : (
          '.'
        )}
      </Claim>
    );
  }

  if (kpis.avg_order_value != null) {
    claims.push(
      <Claim key="aov" to="/dashboard" source="See Average order on the dashboard">
        The average order is worth <Money value={kpis.avg_order_value} />
        {kpis.unique_customers != null ? (
          <>
            , and <Stat>{formatNumber(kpis.unique_customers)}</Stat> customers are behind them.
          </>
        ) : (
          '.'
        )}
      </Claim>
    );
  }

  if (kpis.total_units_sold != null) {
    claims.push(
      <Claim key="units" to="/dashboard" source="See Units sold on the dashboard">
        <Stat>{formatNumber(kpis.total_units_sold)}</Stat> units left the shelf.
      </Claim>
    );
  }

  if (kpis.avg_discount != null) {
    claims.push(
      <Claim key="discount" to="/dashboard" source="See Average discount on the dashboard">
        Orders carry an average discount of <Stat>{formatPercent(kpis.avg_discount)}</Stat>.
      </Claim>
    );
  }

  const start = formatDay(kpis.date_range_start);
  const end = formatDay(kpis.date_range_end);
  if (start && end) {
    claims.push(
      <Claim key="dates" to="/upload" source="See the file on the upload page">
        Everything above covers <Stat>{start}</Stat> to <Stat>{end}</Stat>.
      </Claim>
    );
  }

  return claims;
}

function LossPanel({ products }) {
  const summary = products?.summary;
  const rows = products?.products;
  if (!summary || !Array.isArray(rows)) return null;
  if (summary.loss_making_products == null) return null;

  const losers = rows
    .filter((p) => p.profit != null && p.profit < 0)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 5);

  const thin = products?.tags?.high_revenue_low_margin || [];

  return (
    <Panel
      title="What lost money"
      description="Read against what each product kept, not what it sold for."
    >
      <ClaimList>
        {summary.loss_making_products > 0 ? (
          <Claim key="losers" to="/products" source="See every product and what it keeps">
            <Stat>{formatNumber(summary.loss_making_products)}</Stat> of{' '}
            <Stat>{formatNumber(summary.total_products)}</Stat> products lost money.
          </Claim>
        ) : (
          <Claim key="no-losers" to="/products" source="See every product and what it keeps">
            Not one of your <Stat>{formatNumber(summary.total_products)}</Stat> products lost
            money.
          </Claim>
        )}

        {thin.length > 0 && (
          <Claim key="thin" to="/products" source="See every product and what it keeps">
            <Stat>{formatNumber(thin.length)}</Stat> products sell above the middle of your
            shelf and still keep under <Stat>5%</Stat> of what they take. Busy shelf space, thin
            return.
          </Claim>
        )}
      </ClaimList>

      {losers.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-lg font-semibold text-ink">The biggest losses</h3>
          <ScrollableTable label="The biggest losses">
            <table className="w-full min-w-[34rem] border-collapse">
              <caption className="sr-only">
                Products that lost money, worst first, with what each sold and kept
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={TH_TEXT}>
                    Product
                  </th>
                  <th scope="col" className={TH_NUM}>
                    Sold
                  </th>
                  <th scope="col" className={TH_NUM}>
                    Kept
                  </th>
                  <th scope="col" className={TH_NUM}>
                    Margin
                  </th>
                </tr>
              </thead>
              <tbody>
                {losers.map((p) => (
                  <tr key={p.product}>
                    <th scope="row" className={TD_ROW_HEAD}>
                      {p.product}
                    </th>
                    <td className={`${TD_NUM} text-ink`}>{formatCurrencyExact(p.revenue)}</td>
                    <td className={`${TD_NUM} ${moneyTone(p.profit)}`}>
                      {formatCurrencyExact(p.profit)}
                    </td>
                    <td className={`${TD_NUM} text-ink`}>
                      {p.margin_pct != null ? formatPercent(p.margin_pct) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
          {summary.loss_making_products > losers.length && (
            <p className="mt-3 text-sm text-ink/70">
              The five worst are here. The other{' '}
              <span className="tabular-nums">
                {formatNumber(summary.loss_making_products - losers.length)}
              </span>{' '}
              are on the products page.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

function MovementPanel({ diagnosis, mappings, roleByColumn }) {
  const overview = diagnosis?.overview;
  if (!overview || overview.absolute_change == null) return null;

  const current = formatMonth(overview.current_month);
  const previous = formatMonth(overview.previous_month);
  if (!current || !previous) return null;

  // Diagnosis runs on the mapped revenue column unless asked otherwise, so only
  // print a figure as money when the column it came from really is money. The
  // mappings fetch is allowed to fail softly, and the server has already refused
  // the KPIs if no mapping exists — so an empty mappings object means the lookup
  // failed, not that the metric is unit-less. Money is the right default there:
  // printing a bare float would drop the currency mark off real money.
  const isMoney =
    !mappings.revenue || overview.metric === mappings.revenue || overview.metric === mappings.profit;
  const printMetric = (v) => (isMoney ? formatCurrencyExact(v) : formatNumber(v));
  const metricName = overview.metric === mappings.profit ? 'What you kept' : 'What you sold';

  const change = overview.absolute_change;
  const verb = change === 0 ? 'held level' : change < 0 ? 'fell' : 'rose';
  const movers = (diagnosis.top_contributors || []).slice(0, 5);
  const biggest = movers[0];

  // A share is change ÷ total change, which the server leaves unbounded. When the
  // month's rises and falls very nearly cancel, that denominator collapses and the
  // ratio blows up to figures like 2,400% that say nothing. When it cancels exactly
  // the server reports 0% on every line, which is worse — it reads as "this moved
  // nothing" beside a column showing that it moved plenty. Both cases print an em
  // dash: no honest share exists, so the page claims none.
  const shareIsMeaningful = change !== 0;
  const shareOf = (pct) =>
    pct != null && shareIsMeaningful && Math.abs(pct) <= 100 ? formatPercent(pct) : null;
  const biggestShare = biggest ? shareOf(biggest.contribution_pct) : null;

  return (
    <Panel
      title="What moved against last month"
      description={`The difference between ${previous} and ${current}, split by where it came from. A share is that line's part of the total move, so a negative share means it pulled the other way. Where the rises and falls cancel out there is no whole to take a share of, and the share reads as a dash.`}
    >
      <ClaimList>
        <Claim key="overview" to="/diagnosis" source="See the full breakdown on the diagnosis page">
          {metricName} {verb} from <Stat>{printMetric(overview.previous_value)}</Stat> in{' '}
          {previous} to <Stat>{printMetric(overview.current_value)}</Stat> in {current} — a move
          of{' '}
          <Move value={change} tone={isMoney ? moneyTone(change) : 'text-ink'}>
            {printMetric(change)}
            {overview.pct_change != null ? ` (${formatSignedPercent(overview.pct_change)})` : ''}
          </Move>
          .
        </Claim>

        {biggest && (
          <Claim key="biggest" to="/diagnosis" source="See the full breakdown on the diagnosis page">
            The single largest piece of that was the{' '}
            {dimensionLabel(biggest.dimension, roleByColumn).toLowerCase()}{' '}
            <Stat>{biggest.value}</Stat>, which moved{' '}
            <Move value={biggest.change} tone={isMoney ? moneyTone(biggest.change) : 'text-ink'}>
              {printMetric(biggest.change)}
            </Move>
            {biggestShare ? (
              <>
                {' '}
                — <Stat>{biggestShare}</Stat> of the whole difference
              </>
            ) : null}
            .
          </Claim>
        )}
      </ClaimList>

      {movers.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-lg font-semibold text-ink">What moved it most</h3>
          <ScrollableTable label="What moved it most">
            <table className="w-full min-w-[34rem] border-collapse">
              <caption className="sr-only">
                The five largest contributors to the change between the last two months
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={TH_TEXT}>
                    What moved
                  </th>
                  <th scope="col" className={TH_TEXT}>
                    Kind
                  </th>
                  <th scope="col" className={TH_NUM}>
                    Change
                  </th>
                  <th scope="col" className={TH_NUM}>
                    Share of the move
                  </th>
                </tr>
              </thead>
              <tbody>
                {movers.map((m) => (
                  <tr key={`${m.dimension}-${m.value}`}>
                    <th scope="row" className={TD_ROW_HEAD}>
                      {m.value}
                    </th>
                    <td className={`${TD_TEXT} font-normal text-ink/70`}>
                      {dimensionLabel(m.dimension, roleByColumn)}
                    </td>
                    <td className={`${TD_NUM} ${isMoney ? moneyTone(m.change) : 'text-ink'}`}>
                      {printMetric(m.change)}
                    </td>
                    <td className={`${TD_NUM} text-ink`}>{shareOf(m.contribution_pct) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------- page */

export default function AssistantPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [products, setProducts] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clearing here rather than in the effect keeps the old file's briefing from
  // sitting on screen under a new dataset's name while the next fetch runs.
  function handleSelect(id) {
    setDatasetId(id || null);
    setKpis(null);
    setProducts(null);
    setDiagnosis(null);
    setMappings({});
    setError(null);
  }

  useEffect(() => {
    if (!datasetId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Only the KPIs are required. The other three are allowed to be absent —
    // a file with one month has no diagnosis, and one without a profit column
    // has nothing to say about losses. Those sections just do not appear.
    Promise.all([
      getDashboardKpis(datasetId),
      getProductProfitability(datasetId).catch(() => null),
      getDiagnosis(datasetId).catch(() => null),
      getColumnMappings(datasetId).catch(() => null),
    ])
      .then(([kpiRes, productRes, diagnosisRes, mappingRes]) => {
        if (cancelled) return;
        setKpis(kpiRes.kpis);
        setProducts(productRes);
        setDiagnosis(diagnosisRes);
        setMappings(mappingRes?.mappings || {});
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.detail || 'The figures for this dataset could not be read.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  const roleByColumn = {};
  Object.entries(mappings).forEach(([role, column]) => {
    if (column) roleByColumn[column] = role;
  });

  const headline = headlineClaims(kpis);
  const ready = Boolean(kpis) && !loading && !error;

  return (
    <div>
      <PageHeader
        title="Assistant"
        description="A short written briefing on the file you are reading, built from the same figures every other page shows."
      />

      <DatasetSelector selectedId={datasetId} onSelect={handleSelect} />

      <div className="space-y-6">
        <Panel title="How this briefing is written">
          <p className="max-w-[72ch] leading-[1.65] text-ink/85">
            Every sentence here is a fixed template with your own figures dropped into it. Nothing
            is written by a model and nothing is rephrased — the numbers come straight from the
            dashboard, products and diagnosis pages, and each line links to the page that proves it.
            When a figure is missing from your file, the sentence that needed it is left out rather
            than guessed at.
          </p>
        </Panel>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 border-l-[3px] border-warn bg-sheet py-3 pr-4 pl-3.5 text-sm text-ink"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            <div className="max-w-[70ch]">
              <p className="font-medium">No briefing yet: {error}</p>
              <p className="mt-1 text-ink/85">
                This usually means the file&rsquo;s column meanings have not been set yet.{' '}
                <Link to="/upload" className={LINK}>
                  Open your files
                </Link>
                , open this one, and say which column holds your sales figures, then come back.
              </p>
            </div>
          </div>
        )}

        {loading && <LoadingSpinner message="Reading your figures" />}

        {!datasetId && !loading && (
          <Panel>
            <p className="max-w-[72ch] leading-[1.65] text-ink/85">
              Pick a dataset above and the briefing writes itself from its figures. If there is
              nothing to pick yet,{' '}
              <Link to="/upload" className={LINK}>
                upload a sales file
              </Link>{' '}
              first.
            </p>
          </Panel>
        )}

        {ready && headline.length > 0 && (
          <Panel title="What the file says" description="Totals for the whole file.">
            <ClaimList>{headline}</ClaimList>
          </Panel>
        )}

        {ready && headline.length === 0 && (
          <Panel title="What the file says">
            <p className="max-w-[72ch] leading-[1.65] text-ink/85">
              There is nothing to report yet. The briefing needs one column set as the date and one
              set as your sales figures.{' '}
              <Link to="/upload" className={LINK}>
                Open your files
              </Link>
              , open this one, and set those two column meanings. Then this fills in.
            </p>
          </Panel>
        )}

        {ready && <LossPanel products={products} />}

        {ready && (
          <MovementPanel
            diagnosis={diagnosis}
            mappings={mappings}
            roleByColumn={roleByColumn}
          />
        )}

        {ready && (
          <Panel title="What this briefing cannot tell you">
            <ul className="max-w-[72ch] space-y-3 leading-[1.65] text-ink/75">
              <li>
                Why anything moved. The contributions are arithmetic — the difference between the
                last two months in the file, divided by category, region, customer and product.
              </li>
              <li>
                What discount a single product carried. The product breakdown reports what each one
                sold and kept; the discount behind it is only reported as a file-wide average.
              </li>
              <li>
                Anything about a month the file does not contain. Change is always measured against
                the previous month in your own data, never against a target or a forecast.
              </li>
              <li>
                Anything you cannot check. Every line above appears on another page, and the link
                beside it goes there.
              </li>
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import DatasetSelector from '../components/Shared/DatasetSelector';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import { getDashboardKpis, getProductProfitability, listDatasets } from '../api/client';
import { formatCurrencyExact, formatPercent } from '../lib/format';

/* The one page in this app meant to leave the screen.
 *
 * A receipt is the document format retail already prints all day, so the
 * summary is issued as one — to the business rather than the customer, with
 * what was KEPT where the price would normally sit. The sentences beside it say
 * the same thing in plain English, because a strip of paper alone on A4 reads
 * as a printing error.
 *
 * Every line is built from figures the API actually returns. Where a figure is
 * missing, the sentence that needed it is left out rather than guessed at — the
 * product's whole claim is that it reports rather than invents. */

/* Most things that stop a page are a column whose meaning was never set, so the
   error ends at the one screen that can fix it rather than leaving a person to
   find it. */
const FIX_LINK =
  'font-medium text-ink underline underline-offset-4 hover:no-underline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

const TEAR_POINTS = (() => {
  const pts = ['0,0', '240,0'];
  for (let x = 235; x > 0; x -= 10) {
    pts.push(x + ',8');
    pts.push(x - 5 + ',0');
  }
  return pts.join(' ');
})();

const longDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

const shortDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;

/** Trim a product name to something a 76mm receipt can actually print. */
const onLine = (name, max = 27) =>
  name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;

export default function SummaryPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!datasetId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getDashboardKpis(datasetId),
      getProductProfitability(datasetId),
      listDatasets(),
    ])
      .then(([kpiRes, prof, datasets]) => {
        setData({
          kpis: kpiRes.kpis || kpiRes,
          products: prof.products || [],
          summary: prof.summary || {},
          dataset: (datasets || []).find((d) => d.id === datasetId) || null,
        });
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not read this dataset'))
      .finally(() => setLoading(false));
  }, [datasetId]);

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Summary"
          description="A one-page summary of what this file sold and what you kept, sized for A4 and built to be printed or saved as a PDF."
          action={
            data && !loading ? (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-ink px-5 py-3 font-display text-lg font-semibold tracking-wide text-paper hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                <Printer size={17} aria-hidden="true" />
                Print this summary
              </button>
            ) : null
          }
        />
        <DatasetSelector selectedId={datasetId} onSelect={setDatasetId} />
      </div>

      {!datasetId && !loading && (
        <p className="border border-kraft bg-sheet p-5 text-ink/85 print:hidden">
          Choose a dataset above and this page builds a printable summary from it.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 border-l-[3px] border-loss bg-sheet py-3 pr-4 pl-3.5 text-sm text-ink print:hidden"
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

      {loading && <LoadingSpinner message="Building your summary" />}

      {data && !loading && <Sheet {...data} />}
    </div>
  );
}

function Sheet({ kpis, products, summary, dataset }) {
  const sold = kpis.total_revenue;
  const kept = kpis.total_profit;
  const margin = kpis.profit_margin ?? summary.avg_margin_pct;
  const lossCount = summary.loss_making_products ?? 0;
  const totalProducts = summary.total_products ?? products.length;

  const worst = products.reduce(
    (acc, p) => (p.profit != null && (acc == null || p.profit < acc.profit) ? p : acc),
    null,
  );
  // "Your best sellers can be your worst products" is the claim this whole app
  // makes, so the sheet has to find the case rather than trip over a threshold.
  // Among the five biggest sellers, take the one earning least without actually
  // losing money — and only say it if that margin is genuinely thin.
  const thin = products
    .slice(0, 5)
    .filter((p) => p.margin_pct != null && p.margin_pct >= 0)
    .sort((a, b) => a.margin_pct - b.margin_pct)[0];
  const thinWorthSaying = thin && thin.margin_pct < 10;

  const lines = [];
  if (sold != null && kept != null) {
    lines.push(
      `You sold ${formatCurrencyExact(sold)} and kept ${formatCurrencyExact(kept)} of it${
        margin != null ? `, a margin of ${formatPercent(margin)}` : ''
      }.`,
    );
  }
  if (lossCount > 0 && worst && worst.profit < 0) {
    lines.push(
      lossCount === 1
        ? `One product lost money. ${worst.product} sold ${formatCurrencyExact(worst.revenue)} and cost you ${formatCurrencyExact(Math.abs(worst.profit))}.`
        : `${lossCount} products lost money. The worst was ${worst.product}, which sold ${formatCurrencyExact(worst.revenue)} and cost you ${formatCurrencyExact(Math.abs(worst.profit))}.`,
    );
  }
  if (thinWorthSaying) {
    lines.push(
      `${thin.product} is among your biggest sellers but kept only ${formatCurrencyExact(thin.profit)} on ${formatCurrencyExact(thin.revenue)}, a margin of ${formatPercent(thin.margin_pct)}.`,
    );
  }
  if (kpis.revenue_growth_pct != null) {
    const g = kpis.revenue_growth_pct;
    lines.push(
      g < 0
        ? `Sales came in ${formatPercent(Math.abs(g))} under the month before.`
        : `Sales came in ${formatPercent(g)} above the month before.`,
    );
  }

  const range =
    kpis.date_range_start && kpis.date_range_end
      ? `${shortDate(kpis.date_range_start)} to ${shortDate(kpis.date_range_end)}`
      : null;

  return (
    <article className="border border-kraft bg-sheet p-8 print:border-0 print:bg-white print:p-0">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-kraft pb-4">
        <p className="font-display text-2xl font-bold tracking-tight text-ink">BizOptAI</p>
        <p className="text-sm text-ink/70">
          {dataset ? dataset.name : 'Your file'}
          {range ? `, ${range}` : ''}
        </p>
      </header>

      <div className="sheet-grid grid gap-10 md:grid-cols-[auto_1fr] md:gap-12">
        <Receipt
          products={products}
          worst={worst}
          sold={sold}
          kept={kept}
          lossCount={lossCount}
          totalProducts={totalProducts}
          dataset={dataset}
          range={range}
        />

        <div>
          {margin != null && (
            <p className="font-display text-6xl leading-none font-bold tracking-tight text-ink">
              {formatPercent(margin)}
            </p>
          )}
          <p className="mt-2 text-ink/70">of what you sold, you kept.</p>

          <div className="mt-7 space-y-4 text-[1.0625rem] leading-[1.6] text-ink">
            {lines.map((line) => (
              <p key={line} className="sheet-prose max-w-[58ch]">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-10 border-t border-kraft pt-4 text-sm text-ink/70">
        <p>
          Built from {totalProducts} products across {kpis.total_orders ?? '—'} orders
          {kpis.date_range_end ? `, read up to ${longDate(kpis.date_range_end)}` : ''}. These
          figures are arithmetic from your own file, not advice.
        </p>
      </footer>
    </article>
  );
}

function Rule() {
  return <div className="my-2.5 border-t border-dashed border-ink/30" aria-hidden="true" />;
}

function Receipt({ products, worst, sold, kept, lossCount, totalProducts, dataset, range }) {
  // Top sellers, plus the loss-maker even when it is not among them — a summary
  // that hides the thing it exists to report would be worthless.
  const top = products.slice(0, 7);
  const rows =
    worst && worst.profit < 0 && !top.some((p) => p.product === worst.product)
      ? [...top, worst]
      : top;

  return (
    <div className="sheet-receipt w-full max-w-[21rem]">
      <div className="bg-paper px-5 pt-5 pb-3 font-receipt text-[12px] leading-[1.55] text-ink print:bg-white">
        <div className="text-center">
          <p className="font-bold tracking-[0.2em]">BIZOPTAI</p>
          <p className="mt-1.5 text-[10px] text-ink/70">{dataset ? dataset.name.toUpperCase() : 'SUMMARY'}</p>
          {range && <p className="text-[10px] text-ink/70">{range.toUpperCase()}</p>}
        </div>

        <Rule />

        <div className="flex justify-between text-[10px] text-ink/70">
          <span>ITEM</span>
          <span>KEPT</span>
        </div>

        <ul className="mt-2 space-y-2">
          {rows.map((p) => {
            const losing = p.profit != null && p.profit < 0;
            return (
              <li
                key={p.product}
                className={
                  losing
                    ? '-mx-5 border-l-[3px] border-loss bg-loss/10 py-1.5 pr-5 pl-[17px] text-loss print:bg-transparent'
                    : ''
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate">{onLine(p.product).toUpperCase()}</span>
                  <span className={`shrink-0 tabular-nums ${losing ? 'font-bold' : 'font-bold'}`}>
                    {p.profit != null ? formatCurrencyExact(p.profit).replace('$', '') : '—'}
                  </span>
                </div>
                <div className={`flex justify-between gap-3 text-[10px] ${losing ? 'text-loss' : 'text-ink/70'}`}>
                  <span className="tabular-nums">SOLD {formatCurrencyExact(p.revenue).replace('$', '')}</span>
                  <span className="shrink-0 tabular-nums">
                    {p.margin_pct != null ? `${p.margin_pct}%` : ''}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <Rule />

        <div className="flex items-baseline justify-between text-[10px] text-ink/70">
          <span>SOLD</span>
          <span className="tabular-nums">{formatCurrencyExact(sold).replace('$', '')}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-[14px] font-bold">
          <span>KEPT</span>
          <span className="tabular-nums">{formatCurrencyExact(kept).replace('$', '')}</span>
        </div>

        <Rule />

        <p className="text-center text-[10px] text-ink/70">
          {lossCount} OF {totalProducts} PRODUCTS LOST MONEY
        </p>
      </div>

      <svg
        viewBox="0 0 240 8"
        preserveAspectRatio="none"
        className="block h-2 w-full text-paper print:text-white"
        aria-hidden="true"
      >
        <polygon points={TEAR_POINTS} fill="currentColor" />
      </svg>
    </div>
  );
}

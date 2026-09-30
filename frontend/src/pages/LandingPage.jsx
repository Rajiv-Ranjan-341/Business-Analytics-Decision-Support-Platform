import { Link } from 'react-router-dom';

// Figures below are computed from backend/data/sample/sample_superstore.csv.
// If that file changes, these change with it.
const LEDGER_LINES = [
  { item: 'CANON IMAGECLASS 2200 COPIER', sold: '2,999.95', kept: '1,199.98', off: 'NO DISCOUNT' },
  { item: 'CHROMCRAFT CONFERENCE TABLES', sold: '1,706.18', kept: '85.31', off: '20% OFF' },
  { item: 'NOVIMEX EXEC LEATHER ARMCHAIR', sold: '1,000.00', kept: '300.00', off: 'NO DISCOUNT' },
  { item: 'BRETFORD CR4500 SLIM TABLE', sold: '957.58', kept: '-383.03', off: '45% OFF', loss: true },
  { item: 'CISCO SPA 501G IP PHONE', sold: '911.42', kept: '68.36', off: '20% OFF' },
];

const CAPABILITIES = [
  {
    title: 'Find the losers',
    body: 'Every product ranked by what you actually kept, not by what it sold for. The ones losing money get flagged, and so do the ones selling well on a margin too thin to be worth the shelf space.',
  },
  {
    title: 'Explain the drop',
    body: 'When a month comes in under the one before it, the difference gets broken down into the five categories, regions, customers or products that moved it most. You see where the money went, not just that it went.',
  },
  {
    title: 'See next month',
    body: 'Two models run against your history: gradient boosting on lagged sales, and exponential smoothing. Whichever one predicted your past more accurately is the one you get, and the page tells you which it picked and how far off it has been running.',
  },
  {
    title: 'Try it before you do it',
    body: 'Move price, discount, demand or cost and watch profit respond before you commit to anything real. A discount assumes demand rises about one and a half percent for every percent you cut.',
  },
];

const LIMITS = [
  'It shows you what changed, not why it changed. The contributions are arithmetic, not causation.',
  'The discount response is a fixed assumption, not a figure estimated from your own sales.',
  'Forecasts need roughly thirty data points behind them before they are worth reading.',
  'It runs for one person on one machine. There is no login yet.',
];

// Torn bottom edge of the receipt, drawn rather than masked so it renders
// identically everywhere. Straight along the top, sawtooth along the bottom.
const TEAR_POINTS = (() => {
  const points = ['0,0', '240,0'];
  for (let x = 235; x > 0; x -= 10) {
    points.push(x + ',8');
    points.push(x - 5 + ',0');
  }
  return points.join(' ');
})();

function TearRule() {
  return <div className="my-3 border-t border-dashed border-ink/30" aria-hidden="true" />;
}

function Receipt() {
  return (
    <div className="w-full max-w-[23rem]">
      <div className="mx-2 h-1.5 rounded-full bg-ink/75" aria-hidden="true" />
      <div style={{ filter: 'drop-shadow(0 16px 28px rgba(46, 36, 26, 0.42))' }}>
        <div className="receipt-print">
          <div className="bg-paper px-5 pt-5 pb-3 font-receipt text-[13px] leading-[1.55] text-ink">
            <div className="text-center">
              <p className="font-bold tracking-[0.2em]">BIZOPTAI</p>
              <p className="mt-1.5 text-[11px] text-ink/70">SAMPLE LEDGER</p>
              <p className="text-[11px] text-ink/70">30 ORDERS, JAN TO MAR 2024</p>
            </div>

            <TearRule />

            <div className="flex justify-between text-[11px] text-ink/70">
              <span>ITEM</span>
              <span>KEPT</span>
            </div>

            <ul className="mt-2.5 space-y-2.5">
              {LEDGER_LINES.map((line) => (
                <li
                  key={line.item}
                  className={
                    line.loss
                      ? '-mx-5 border-l-[3px] border-loss bg-loss/10 py-1.5 pr-5 pl-[17px] text-loss'
                      : ''
                  }
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate">{line.item}</span>
                    <span className="shrink-0 font-bold tabular-nums">{line.kept}</span>
                  </div>
                  <div
                    className={
                      'flex items-baseline justify-between gap-3 text-[11px] ' +
                      (line.loss ? 'text-loss' : 'text-ink/70')
                    }
                  >
                    <span className="tabular-nums">SOLD {line.sold}</span>
                    <span className="shrink-0">{line.off}</span>
                  </div>
                </li>
              ))}
            </ul>

            <TearRule />

            <div className="flex items-baseline justify-between text-[11px] text-ink/70">
              <span>SOLD</span>
              <span className="tabular-nums">12,790.23</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-[15px] font-bold">
              <span>KEPT</span>
              <span className="tabular-nums">2,583.50</span>
            </div>

            <TearRule />

            <p className="text-center text-[11px] text-ink/70">1 OF 30 PRODUCTS LOST MONEY</p>
          </div>

          <svg
            viewBox="0 0 240 8"
            preserveAspectRatio="none"
            className="block h-2 w-full text-paper"
            aria-hidden="true"
          >
            <polygon points={TEAR_POINTS} fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <div className="bg-sticker">
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <span className="font-display text-2xl font-bold tracking-tight">BizOptAI</span>
          <Link
            to="/dashboard"
            className="text-sm font-medium underline underline-offset-4 hover:no-underline focus-visible:rounded-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          >
            Open the dashboard
          </Link>
        </header>

        <section className="mx-auto max-w-6xl px-6 pt-6 pb-14 md:pb-20">
          <div className="grid items-start gap-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-14">
            <div>
              <h1
                className="font-display font-bold"
                style={{
                  fontSize: 'clamp(2.6rem, 7.4vw, 5.5rem)',
                  lineHeight: '0.93',
                  letterSpacing: '-0.015em',
                }}
              >
                This shop’s second-best seller made eighty-five dollars.
              </h1>

              <p className="mt-7 max-w-[52ch] text-[1.0625rem] leading-[1.6] text-ink/85">
                It sold $1,706 of conference tables at 20% off and kept $85. The fourth-best seller
                lost $383. BizOptAI reads your sales file and finds yours.
              </p>

              <Link
                to="/upload"
                className="mt-9 inline-block bg-ink px-7 py-4 font-display text-xl font-semibold tracking-wide text-paper hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                Upload your sales file
              </Link>
            </div>

            <div className="justify-self-start md:justify-self-end">
              <Receipt />
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <h2 className="max-w-[20ch] font-display text-4xl font-bold md:text-5xl">
          What it does with the file
        </h2>

        <dl className="mt-10 max-w-4xl border-t border-kraft">
          {CAPABILITIES.map((capability) => (
            <div
              key={capability.title}
              className="grid gap-2 border-b border-kraft py-7 md:grid-cols-[15rem_1fr] md:gap-10"
            >
              <dt className="font-display text-2xl font-semibold">{capability.title}</dt>
              <dd className="max-w-[70ch] leading-[1.65] text-ink/85">{capability.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
        <div className="max-w-[62ch] border-l-2 border-kraft pl-6">
          <h2 className="font-display text-3xl font-bold">What it doesn’t do</h2>
          <ul className="mt-5 space-y-3 text-[0.95rem] leading-[1.65] text-ink/75">
            {LIMITS.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <h2 className="max-w-[18ch] font-display text-4xl font-bold md:text-5xl">
            Find out what your shelf is really earning.
          </h2>
          <p className="mt-5 max-w-[54ch] leading-[1.65] text-paper/80">
            Upload a CSV or Excel export from whatever till or spreadsheet you already keep. You map
            your columns once, and every page reads from that mapping.
          </p>
          <Link
            to="/upload"
            className="mt-9 inline-block bg-paper px-7 py-4 font-display text-xl font-semibold tracking-wide text-ink hover:bg-paper/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper"
          >
            Upload your sales file
          </Link>
        </div>

        <footer className="mx-auto max-w-6xl px-6 pb-10">
          <div className="border-t border-paper/20 pt-8 text-sm text-paper/60">
            <p className="max-w-[60ch]">
              BizOptAI reads retail sales files and reports what each product actually earns.
            </p>
            <p className="mt-2 max-w-[60ch]">
              Every figure on this page comes from the thirty-order sample dataset included with the
              project.
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
}

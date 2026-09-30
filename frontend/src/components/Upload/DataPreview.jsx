import { useRef, useState } from 'react';
import { ArrowLeft, ChartColumn, Settings2, Table2, TriangleAlert } from 'lucide-react';
import PageHeader from '../Shared/PageHeader';
import Panel from '../Shared/Panel';
import ColumnMapping from './ColumnMapping';
import { formatNumber, formatPercent } from '../../lib/format';

const TABS = [
  { id: 'preview', label: 'First rows', icon: Table2 },
  { id: 'stats', label: 'Column health', icon: ChartColumn },
  { id: 'mapping', label: 'Column meanings', icon: Settings2 },
];

/** More than one row in ten missing is worth a second look before you trust the column. */
const GAP_THRESHOLD_PCT = 10;

export default function DataPreview({ dataset, onBack }) {
  const [activeTab, setActiveTab] = useState('preview');
  const tabRefs = useRef({});

  function handleTabKeyDown(event) {
    const index = TABS.findIndex((tab) => tab.id === activeTab);
    let next = null;

    if (event.key === 'ArrowRight') next = TABS[(index + 1) % TABS.length];
    else if (event.key === 'ArrowLeft') next = TABS[(index - 1 + TABS.length) % TABS.length];
    else if (event.key === 'Home') next = TABS[0];
    else if (event.key === 'End') next = TABS[TABS.length - 1];

    if (!next) return;
    event.preventDefault();
    setActiveTab(next.id);
    tabRefs.current[next.id]?.focus();
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to your files
      </button>

      <PageHeader
        title={dataset.name}
        description={`Read from ${dataset.original_filename}. Check it here before the rest of the app starts counting from it.`}
      />

      <div className="paper-feed mb-8 grid grid-cols-2 gap-px border border-kraft bg-kraft md:grid-cols-4">
        <Stat label="Rows" value={formatNumber(dataset.row_count)} />
        <Stat label="Columns" value={formatNumber(dataset.column_count)} />
        <Stat
          label="Repeated rows"
          value={formatNumber(dataset.duplicate_count)}
          note={
            dataset.duplicate_count > 0
              ? 'Identical rows appear more than once, so totals may double-count'
              : null
          }
        />
        <Stat label="File size" value={formatFileSize(dataset.file_size_bytes)} />
      </div>

      <div
        role="tablist"
        aria-label="Ways to check this file"
        onKeyDown={handleTabKeyDown}
        className="mb-6 flex flex-wrap border-b border-kraft"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`datapreview-tab-${id}`}
              aria-selected={active}
              aria-controls={`datapreview-panel-${id}`}
              tabIndex={active ? 0 : -1}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              onClick={() => setActiveTab(id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                active ? 'border-ink text-ink' : 'border-transparent text-ink/70 hover:text-ink'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`datapreview-panel-${activeTab}`}
        aria-labelledby={`datapreview-tab-${activeTab}`}
      >
        {activeTab === 'preview' && <PreviewTable rows={dataset.preview_rows} />}
        {activeTab === 'stats' && <StatsTable stats={dataset.column_stats} />}
        {activeTab === 'mapping' && (
          <ColumnMapping datasetId={dataset.id} columns={dataset.column_stats} />
        )}
      </div>
    </div>
  );
}

/** Same tile as the dashboard's KPI strip, so the two screens read as one product. */
function Stat({ label, value, note }) {
  return (
    <div className="bg-sheet px-4 py-4">
      <p className="text-sm text-ink/70">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{value}</p>
      {note && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink/75">
          <TriangleAlert size={13} className="mt-px shrink-0 text-warn" aria-hidden="true" />
          <span>{note}</span>
        </p>
      )}
    </div>
  );
}

function PreviewTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <Panel title="First rows">
        <p className="max-w-[62ch] text-ink/75">
          This file has no rows to show. Export it again with at least one row of sales in it, then
          bring it back in.
        </p>
      </Panel>
    );
  }

  const columns = Object.keys(rows[0]);
  const numericColumns = new Set(columns.filter((col) => isNumericColumn(rows, col)));

  return (
    <Panel
      title="First rows"
      description={`The first ${rows.length} rows, exactly as they were read. Numbers sit on the right.`}
      bodyClassName="p-0"
    >
      <ScrollableTable label="First rows of this file">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            The first {rows.length} rows of this file, one column per heading.
          </caption>
          <thead>
            <tr className="border-b border-kraft bg-paper">
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-ink/75 ${
                    numericColumns.has(col) ? 'text-right' : 'text-left'
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-kraft">
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => {
                  const numeric = numericColumns.has(col);
                  return (
                    <td
                      key={col}
                      className={`px-4 py-2.5 whitespace-nowrap text-ink ${
                        numeric ? 'text-right tabular-nums' : 'text-left'
                      }`}
                    >
                      <Cell value={row[col]} numeric={numeric} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </Panel>
  );
}

function Cell({ value, numeric }) {
  if (value == null) {
    return (
      <span className="text-ink/75">
        —<span className="sr-only"> empty</span>
      </span>
    );
  }
  if (numeric) return <>{formatNumber(value)}</>;

  const text = String(value);
  return (
    <span className="block max-w-[18rem] truncate" title={text}>
      {text}
    </span>
  );
}

function StatsTable({ stats }) {
  if (!stats || stats.length === 0) {
    return (
      <Panel title="Column health">
        <p className="max-w-[62ch] text-ink/75">
          No column readings came back for this file. Open it again, and if it stays empty, bring the
          export in once more.
        </p>
      </Panel>
    );
  }

  const hasGaps = stats.some((col) => col.null_pct > GAP_THRESHOLD_PCT);

  return (
    <Panel
      title="Column health"
      description="What each column holds, how much of it is filled in, and how far its numbers spread."
      bodyClassName="p-0"
    >
      <ScrollableTable label="Health of every column in this file">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            One row per column, with how much of it is filled in and the spread of its values.
          </caption>
          <thead>
            <tr className="border-b border-kraft bg-paper">
              <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-ink/75">
                Column
              </th>
              <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-ink/75">
                Holds
              </th>
              {['Filled', 'Blank', 'Different values', 'Average', 'Spread', 'Lowest', 'Highest'].map(
                (head) => (
                  <th
                    key={head}
                    scope="col"
                    className="px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap text-ink/75"
                  >
                    {head}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-kraft">
            {stats.map((col) => (
              <tr key={col.name}>
                <th
                  scope="row"
                  className="px-4 py-2.5 text-left font-medium whitespace-nowrap text-ink"
                >
                  {col.name}
                </th>
                <td className="px-4 py-2.5 whitespace-nowrap text-ink">
                  {plainType(col.dtype)}
                  <span className="ml-2 font-receipt text-xs text-ink/75">{col.dtype}</span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-ink">
                  {formatNumber(col.count)}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap text-ink">
                  {col.null_pct > GAP_THRESHOLD_PCT ? (
                    <span className="inline-flex items-center gap-1.5">
                      <TriangleAlert size={12} className="shrink-0 text-warn" aria-hidden="true" />
                      <span className="tabular-nums">{formatPercent(col.null_pct)}</span>
                      <span>gaps</span>
                    </span>
                  ) : (
                    <span className="tabular-nums">{formatPercent(col.null_pct)}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-ink">
                  {formatNumber(col.unique_count)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-ink">
                  {formatStat(col.mean)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-ink">
                  {formatStat(col.std)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-ink">
                  {formatStat(col.min)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-ink">
                  {formatStat(col.max)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>

      {hasGaps && (
        <p className="border-t border-kraft px-4 py-3 text-xs text-ink/75">
          A column marked “gaps” is blank on more than one row in ten. Fill it in at the source, or
          leave it out when you say what your columns mean.
        </p>
      )}
    </Panel>
  );
}

/** Keyboard users need to be able to reach and scroll a wide table, not just drag it. */
function ScrollableTable({ label, children }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {children}
    </div>
  );
}

function isNumericColumn(rows, col) {
  let sawNumber = false;
  for (const row of rows) {
    const value = row[col];
    if (value == null) continue;
    if (typeof value !== 'number' || Number.isNaN(value)) return false;
    sawNumber = true;
  }
  return sawNumber;
}

/** Column stats are counts and spreads, not money, so they never take a currency mark. */
function formatStat(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TYPE_WORDS = [
  [/^u?int/, 'Whole number'],
  [/^float/, 'Number'],
  [/^datetime|^timedelta|^period/, 'Date'],
  [/^bool/, 'Yes or no'],
];

function plainType(dtype) {
  const raw = String(dtype ?? '').toLowerCase();
  const hit = TYPE_WORDS.find(([pattern]) => pattern.test(raw));
  return hit ? hit[1] : 'Text';
}

function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

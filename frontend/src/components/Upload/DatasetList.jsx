import { Eye, FileSpreadsheet, Trash2 } from 'lucide-react';
import { formatNumber } from '../../lib/format';

/**
 * A ledger of everything read in so far: hairline-ruled rows, no cards.
 * Rendered inside a Panel with no body padding, so the rules run the full width
 * of the sheet and the rows carry their own inset.
 */
export default function DatasetList({ datasets, onSelect, onDelete }) {
  if (!datasets || datasets.length === 0) {
    return (
      <p className="max-w-[62ch] px-5 py-8 text-ink/75">
        Nothing read in yet. Drop a CSV or Excel export in the tray above and it lands here,
        ready to check before the rest of the app reads from it.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-kraft">
      {datasets.map((ds) => (
        <li
          key={ds.id}
          className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 px-5 py-4"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <FileSpreadsheet size={18} className="mt-1 shrink-0 text-ink/75" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold text-ink">{ds.name}</p>
              <p className="mt-0.5 text-sm text-ink/75">
                <span className="tabular-nums">{formatNumber(ds.row_count)}</span> rows across{' '}
                <span className="tabular-nums">{formatNumber(ds.column_count)}</span> columns, read
                in on{' '}
                {new Date(ds.upload_date).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(ds)}
              className="inline-flex items-center gap-1.5 bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <Eye size={14} aria-hidden="true" />
              Open
              <span className="sr-only"> {ds.name}</span>
            </button>
            {/* Removal is plain ink. Red in this app means money lost, nothing else. */}
            <button
              type="button"
              onClick={() => onDelete(ds.id)}
              className="inline-flex items-center gap-1.5 border border-kraft px-4 py-2 text-sm font-medium text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <Trash2 size={14} aria-hidden="true" />
              Remove
              <span className="sr-only"> {ds.name}</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { listDatasets } from '../../api/client';

export default function DatasetSelector({ selectedId, onSelect }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDatasets()
      .then((rows) => {
        setDatasets(rows);
        // Land on data rather than on an empty page. Reading the most recent
        // file is what someone arriving here almost always wants, and the
        // selector above still lets them switch.
        if (!selectedId && rows.length > 0) onSelect(rows[0].id);
      })
      .finally(() => setLoading(false));
    // Runs once on mount; the auto-selection is intentionally not re-applied
    // after the user picks a different dataset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  if (datasets.length === 0) {
    return (
      <div className="mb-6 flex items-start gap-2.5 border-l-[3px] border-warn bg-sheet py-3 pr-4 pl-3.5 text-sm text-ink">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
        <p>
          Nothing to read yet.{' '}
          <Link
            to="/upload"
            className="font-medium underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Upload a sales file
          </Link>{' '}
          and every page here will fill in.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <label htmlFor="dataset-select" className="text-sm font-medium text-ink/70">
        Reading
      </label>
      <select
        id="dataset-select"
        value={selectedId || ''}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="border border-kraft bg-sheet px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <option value="">Choose a dataset</option>
        {datasets.map((ds) => (
          <option key={ds.id} value={ds.id}>
            {ds.name} ({ds.row_count.toLocaleString()} rows)
          </option>
        ))}
      </select>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Database, AlertCircle } from 'lucide-react';
import { listDatasets } from '../../api/client';

export default function DatasetSelector({ selectedId, onSelect }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDatasets()
      .then(setDatasets)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (datasets.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mb-6">
        <AlertCircle size={16} />
        No datasets uploaded yet. Go to Upload Data to get started.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <Database size={16} className="text-gray-400" />
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a dataset</option>
        {datasets.map((ds) => (
          <option key={ds.id} value={ds.id}>
            {ds.name} ({ds.row_count.toLocaleString()} rows)
          </option>
        ))}
      </select>
    </div>
  );
}

import { FileSpreadsheet, Trash2, Eye } from 'lucide-react';

export default function DatasetList({ datasets, onSelect, onDelete }) {
  if (!datasets || datasets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No datasets uploaded yet. Upload your first dataset above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {datasets.map((ds) => (
        <div
          key={ds.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">{ds.name}</p>
              <p className="text-xs text-gray-400">
                {ds.row_count.toLocaleString()} rows &middot;{' '}
                {ds.column_count} columns &middot;{' '}
                {new Date(ds.upload_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(ds)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Eye size={14} />
              View
            </button>
            <button
              onClick={() => onDelete(ds.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

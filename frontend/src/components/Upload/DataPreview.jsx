import { useState } from 'react';
import { ArrowLeft, Table, BarChart3, Settings2 } from 'lucide-react';
import ColumnMapping from './ColumnMapping';

const TABS = [
  { id: 'preview', label: 'Data Preview', icon: Table },
  { id: 'stats', label: 'Column Stats', icon: BarChart3 },
  { id: 'mapping', label: 'Column Mapping', icon: Settings2 },
];

export default function DataPreview({ dataset, onBack }) {
  const [activeTab, setActiveTab] = useState('preview');

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} />
        Back to datasets
      </button>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{dataset.name}</h2>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>{dataset.row_count.toLocaleString()} rows</span>
            <span>{dataset.column_count} columns</span>
            <span>{dataset.duplicate_count} duplicates</span>
            <span>{(dataset.file_size_bytes / 1024).toFixed(1)} KB</span>
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'preview' && <PreviewTable rows={dataset.preview_rows} />}
          {activeTab === 'stats' && <StatsTable stats={dataset.column_stats} />}
          {activeTab === 'mapping' && <ColumnMapping datasetId={dataset.id} columns={dataset.column_stats.map(c => c.name)} />}
        </div>
      </div>
    </div>
  );
}

function PreviewTable({ rows }) {
  if (!rows || rows.length === 0) return <p className="text-gray-400 text-sm">No data</p>;

  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                >
                  {row[col] == null ? (
                    <span className="text-gray-300 italic">null</span>
                  ) : (
                    String(row[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatsTable({ stats }) {
  if (!stats || stats.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Column</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Non-null</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Null %</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Unique</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Mean</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Std</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Min</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Max</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {stats.map((col) => (
            <tr key={col.name} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800">{col.name}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                  {col.dtype}
                </span>
              </td>
              <td className="px-3 py-2 text-right text-gray-700">{col.count}</td>
              <td className="px-3 py-2 text-right">
                <span className={col.null_pct > 10 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                  {col.null_pct}%
                </span>
              </td>
              <td className="px-3 py-2 text-right text-gray-700">{col.unique_count}</td>
              <td className="px-3 py-2 text-right text-gray-700">{col.mean != null ? col.mean.toFixed(2) : '-'}</td>
              <td className="px-3 py-2 text-right text-gray-700">{col.std != null ? col.std.toFixed(2) : '-'}</td>
              <td className="px-3 py-2 text-right text-gray-700">{col.min != null ? col.min.toFixed(2) : '-'}</td>
              <td className="px-3 py-2 text-right text-gray-700">{col.max != null ? col.max.toFixed(2) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

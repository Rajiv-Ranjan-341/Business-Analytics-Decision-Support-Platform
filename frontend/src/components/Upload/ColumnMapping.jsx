import { useState, useEffect } from 'react';
import { Check, Wand2 } from 'lucide-react';
import {
  getColumnSuggestions,
  saveColumnMappings,
  getColumnMappings,
} from '../../api/client';

const ROLES = [
  { key: 'date', label: 'Date', description: 'Order or transaction date' },
  { key: 'revenue', label: 'Revenue / Sales', description: 'Revenue or sales amount' },
  { key: 'profit', label: 'Profit', description: 'Profit amount' },
  { key: 'quantity', label: 'Quantity', description: 'Number of units' },
  { key: 'customer_id', label: 'Customer ID', description: 'Customer identifier' },
  { key: 'product', label: 'Product', description: 'Product name or ID' },
  { key: 'category', label: 'Category', description: 'Product category' },
  { key: 'region', label: 'Region', description: 'Geographic region' },
  { key: 'discount', label: 'Discount', description: 'Discount applied' },
  { key: 'cost', label: 'Cost', description: 'Product or order cost' },
];

export default function ColumnMapping({ datasetId, columns }) {
  const [mappings, setMappings] = useState({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getColumnMappings(datasetId).then((res) => {
      if (res.mappings && Object.keys(res.mappings).length > 0) {
        setMappings(res.mappings);
      }
    }).catch(() => {});
  }, [datasetId]);

  async function handleAutoDetect() {
    setLoading(true);
    try {
      const res = await getColumnSuggestions(datasetId);
      const nonNull = {};
      for (const [k, v] of Object.entries(res.suggestions)) {
        if (v) nonNull[k] = v;
      }
      setMappings((prev) => ({ ...prev, ...nonNull }));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaved(false);
    await saveColumnMappings(datasetId, mappings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleChange(role, value) {
    setMappings((prev) => ({ ...prev, [role]: value || '' }));
    setSaved(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Map your data columns to business roles so the platform can analyze them.
        </p>
        <button
          onClick={handleAutoDetect}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <Wand2 size={14} />
          {loading ? 'Detecting...' : 'Auto-detect'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ROLES.map(({ key, label, description }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <select
              value={mappings[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select column --</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Mappings
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check size={14} />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

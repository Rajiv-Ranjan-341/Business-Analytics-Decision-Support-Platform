import { useEffect, useId, useRef, useState } from 'react';
import { Check, Sparkles, TriangleAlert } from 'lucide-react';
import Panel from '../Shared/Panel';
import {
  getColumnSuggestions,
  saveColumnMappings,
  getColumnMappings,
} from '../../api/client';

/**
 * The ten role keys below must match suggest_column_roles() in
 * backend/app/services/data_processor.py exactly. They are grouped here only so a
 * shop owner reads three short questions instead of one wall of ten selects — the
 * money group first, because that is the answer the whole product is built on.
 */
const GROUPS = [
  {
    id: 'money',
    title: 'Money',
    blurb:
      'Every figure in this app is counted from these. Point revenue at the right column and the rest follows.',
    highlight: true,
    roles: [
      {
        key: 'revenue',
        label: 'Sold',
        hint: 'What the customer paid, before any costs come off',
        required: true,
      },
      { key: 'profit', label: 'Kept', hint: 'What was left once costs came off' },
      { key: 'cost', label: 'Cost', hint: 'What the item cost you to buy or make' },
      { key: 'discount', label: 'Discount', hint: 'How much came off the price' },
    ],
  },
  {
    id: 'timing',
    title: 'When and how many',
    blurb: 'Trends, forecasts and month-on-month comparisons all read from these two.',
    roles: [
      {
        key: 'date',
        label: 'Order date',
        hint: 'The day the sale happened',
        required: true,
      },
      { key: 'quantity', label: 'Units', hint: 'How many went out on the line' },
    ],
  },
  {
    id: 'grouping',
    title: 'Who and what',
    blurb: 'These split every figure into the groups you actually manage day to day.',
    roles: [
      {
        key: 'customer_id',
        label: 'Customer',
        hint: 'Whatever you use to tell one customer from another',
      },
      { key: 'product', label: 'Product', hint: 'The item name or code' },
      { key: 'category', label: 'Category', hint: 'How you group products together' },
      { key: 'region', label: 'Region', hint: 'Store, city, state or territory' },
    ],
  },
];

const ALL_ROLES = GROUPS.flatMap((group) => group.roles);

export default function ColumnMapping({ datasetId, columns }) {
  const [mappings, setMappings] = useState({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fieldId = useId();
  const savedTimer = useRef(null);

  // Accepts either bare column names or the richer column_stats objects, so a
  // sample value can be echoed back under a mapping as a sanity check.
  const columnList = (columns || []).map((col) =>
    typeof col === 'string' ? { name: col } : col
  );
  const columnNames = columnList.map((col) => col.name);
  const statsByName = new Map(columnList.map((col) => [col.name, col]));

  useEffect(() => {
    getColumnMappings(datasetId)
      .then((res) => {
        if (res.mappings && Object.keys(res.mappings).length > 0) {
          setMappings(res.mappings);
        }
      })
      .catch(() => {});
  }, [datasetId]);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  async function handleAutoDetect() {
    setLoading(true);
    setError(null);
    try {
      const res = await getColumnSuggestions(datasetId);
      const nonNull = {};
      for (const [k, v] of Object.entries(res.suggestions)) {
        if (v) nonNull[k] = v;
      }
      setMappings((prev) => ({ ...prev, ...nonNull }));
      setSaved(false);
    } catch {
      setError(
        'Could not read the column names just now. Choose the columns yourself, or try the guess again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaved(false);
    setError(null);
    setSaving(true);
    try {
      await saveColumnMappings(datasetId, mappings);
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } catch {
      // Previously this rejection went nowhere and the user was left thinking it saved.
      setError('Nothing was saved. Check the backend is running, then press save again.');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(role, value) {
    setMappings((prev) => ({ ...prev, [role]: value || '' }));
    setSaved(false);
  }

  const mappedCount = ALL_ROLES.filter((role) => mappings[role.key]).length;

  return (
    <Panel
      title="What each column means"
      description="Point each role at a column from your file. Every other page reads these, so this is the step worth getting right."
      bodyClassName="p-0"
      action={
        <button
          type="button"
          onClick={handleAutoDetect}
          disabled={loading}
          className="inline-flex items-center gap-2 border border-ink px-3.5 py-2 text-sm font-medium text-ink enabled:hover:bg-ink enabled:hover:text-paper disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Sparkles size={14} aria-hidden="true" />
          {loading ? 'Reading column names' : 'Guess from column names'}
        </button>
      }
    >
      {GROUPS.map((group) => (
        <fieldset key={group.id} className="border-b border-kraft px-5 py-5">
          <legend className="font-display text-xl font-semibold text-ink">
            <span className={group.highlight ? 'bg-sticker px-1.5 py-0.5' : undefined}>
              {group.title}
            </span>
          </legend>
          <p className="mt-1.5 max-w-[70ch] text-sm text-ink/75">{group.blurb}</p>

          <div className="mt-4 divide-y divide-kraft border-t border-kraft">
            {group.roles.map((role) => (
              <RoleRow
                key={role.key}
                role={role}
                idPrefix={fieldId}
                value={mappings[role.key] || ''}
                columnNames={columnNames}
                stat={statsByName.get(mappings[role.key])}
                onChange={handleChange}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="px-5 py-5">
        {error && (
          <p
            role="alert"
            className="mb-4 flex items-start gap-2.5 border-l-[3px] border-warn bg-paper py-3 pr-4 pl-3.5 text-sm text-ink"
          >
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-ink px-6 py-3 font-display text-lg font-semibold tracking-wide text-paper enabled:hover:bg-ink/90 disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {saving ? 'Saving' : 'Save column meanings'}
          </button>

          <p className="text-sm text-ink/75">
            <span className="tabular-nums">{mappedCount}</span> of{' '}
            <span className="tabular-nums">{ALL_ROLES.length}</span> roles point at a column
          </p>

          <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-ink">
            {saved && (
              <>
                <Check size={15} aria-hidden="true" />
                Saved
              </>
            )}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function RoleRow({ role, idPrefix, value, columnNames, stat, onChange }) {
  const { key, label, hint, required } = role;
  const selectId = `${idPrefix}-${key}`;
  const hintId = `${selectId}-hint`;
  // A mapping saved against a column this file does not have would otherwise
  // render as a blank select with no explanation.
  const missing = value !== '' && !columnNames.includes(value);
  const sample = stat?.top_values?.[0]?.value;

  return (
    <div className="grid gap-x-6 gap-y-2 py-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] md:items-start">
      <div>
        <label htmlFor={selectId} className="font-medium text-ink">
          {label}
        </label>
        {required && (
          <span
            className="ml-2 border border-kraft px-1.5 py-0.5 text-xs text-ink/75 align-middle"
            aria-hidden="true"
          >
            needed
          </span>
        )}
        <p id={hintId} className="mt-0.5 max-w-[60ch] text-sm text-ink/75">
          {hint}
          {required && ' — most pages need this one.'}
        </p>
      </div>

      <div>
        <select
          id={selectId}
          aria-describedby={hintId}
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
          className="w-full border border-kraft bg-sheet px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <option value="">Not in this file</option>
          {missing && <option value={value}>{value} (missing from this file)</option>}
          {columnNames.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>

        {missing && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink/75">
            <TriangleAlert size={12} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            <span>This file has no column by that name. Pick another one.</span>
          </p>
        )}

        {!missing && value !== '' && sample != null && (
          <p className="mt-1.5 truncate text-xs text-ink/75" title={String(sample)}>
            Reads like <span className="font-receipt text-ink">{String(sample)}</span>
          </p>
        )}
      </div>
    </div>
  );
}

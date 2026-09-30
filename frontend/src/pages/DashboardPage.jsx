import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import Panel from '../components/Shared/Panel';
import DatasetSelector from '../components/Shared/DatasetSelector';
import KPICards from '../components/Dashboard/KPICards';
import SalesChart from '../components/Dashboard/SalesChart';
import CategoryBreakdown from '../components/Dashboard/CategoryBreakdown';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import {
  getDashboardKpis,
  getMonthlyTrend,
  getCategoryBreakdown,
  getRegionBreakdown,
} from '../api/client';

export default function DashboardPage() {
  const [datasetId, setDatasetId] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [trend, setTrend] = useState(null);
  const [categories, setCategories] = useState(null);
  const [regions, setRegions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!datasetId) {
      // Clearing the select used to leave the previous dataset's figures on screen
      // underneath the "pick a dataset" prompt.
      setKpis(null);
      setTrend(null);
      setCategories(null);
      setRegions(null);
      setError(null);
      // Clearing the select while a fetch is still in flight cancels that run via the
      // `current` guard below, so its `finally` never fires. Without this the spinner
      // would stay up next to the empty state for good.
      setLoading(false);
      return undefined;
    }

    // Switching datasets mid-request used to let the slower reply win and paint the
    // wrong file's numbers. The stale run is ignored instead.
    let current = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getDashboardKpis(datasetId),
      getMonthlyTrend(datasetId),
      getCategoryBreakdown(datasetId).catch(() => null),
      getRegionBreakdown(datasetId).catch(() => null),
    ])
      .then(([kpiRes, trendRes, catRes, regRes]) => {
        if (!current) return;
        setKpis(kpiRes.kpis);
        setTrend(trendRes.data);
        setCategories(catRes?.data || null);
        setRegions(regRes?.data || null);
      })
      .catch((err) => {
        if (!current) return;
        setKpis(null);
        setTrend(null);
        setCategories(null);
        setRegions(null);
        setError(err.response?.data?.detail || 'That dataset could not be read.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [datasetId]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="What this file sold, what you kept on it, and where the money came from."
      />

      <DatasetSelector selectedId={datasetId} onSelect={setDatasetId} />

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 border-l-[3px] border-warn bg-sheet py-3 pr-4 pl-3.5 text-sm text-ink"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          <div className="max-w-[70ch]">
            <p className="font-semibold">Warning: the dashboard could not be built</p>
            <p className="mt-0.5 text-ink/85">{error}</p>
            <p className="mt-1 text-ink/75">
              <Link
                to="/upload"
                className="font-medium text-ink underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Open your files
              </Link>
               to check this one's column meanings. Then choose the file here again.
            </p>
          </div>
        </div>
      )}

      {!datasetId && (
        <Panel title="Nothing to show yet">
          <p className="max-w-[62ch] text-sm text-ink/75">
            Point this page at a dataset above and it fills in: what you sold, what you kept, the
            month-by-month trend, and which categories and regions brought in the most.
          </p>
        </Panel>
      )}

      {loading && <LoadingSpinner message="Adding up your sales" />}

      {kpis && !loading && (
        <>
          <KPICards kpis={kpis} />
          <div className="space-y-4">
            <SalesChart data={trend} />
            <CategoryBreakdown categoryData={categories} regionData={regions} />
          </div>
        </>
      )}
    </div>
  );
}

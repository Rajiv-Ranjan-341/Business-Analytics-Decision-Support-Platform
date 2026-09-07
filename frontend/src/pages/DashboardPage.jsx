import { useState, useEffect } from 'react';
import PageHeader from '../components/Shared/PageHeader';
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
    if (!datasetId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      getDashboardKpis(datasetId),
      getMonthlyTrend(datasetId),
      getCategoryBreakdown(datasetId).catch(() => null),
      getRegionBreakdown(datasetId).catch(() => null),
    ])
      .then(([kpiRes, trendRes, catRes, regRes]) => {
        setKpis(kpiRes.kpis);
        setTrend(trendRes.data);
        setCategories(catRes?.data || null);
        setRegions(regRes?.data || null);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, [datasetId]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Business intelligence overview with KPIs, trends, and breakdowns."
      />

      <DatasetSelector selectedId={datasetId} onSelect={setDatasetId} />

      {!datasetId && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Select a dataset to view the dashboard.</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && <LoadingSpinner message="Computing KPIs and charts..." />}

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

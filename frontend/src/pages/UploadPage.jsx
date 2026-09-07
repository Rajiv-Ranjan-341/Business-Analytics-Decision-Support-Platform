import { useState, useEffect } from 'react';
import PageHeader from '../components/Shared/PageHeader';
import FileUpload from '../components/Upload/FileUpload';
import DatasetList from '../components/Upload/DatasetList';
import DataPreview from '../components/Upload/DataPreview';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import { listDatasets, getDatasetDetail, deleteDataset } from '../api/client';

export default function UploadPage() {
  const [datasets, setDatasets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatasets();
  }, []);

  async function fetchDatasets() {
    setLoading(true);
    try {
      const data = await listDatasets();
      setDatasets(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadSuccess(dataset) {
    await fetchDatasets();
    handleSelect(dataset);
  }

  async function handleSelect(ds) {
    setDetailLoading(true);
    try {
      const detail = await getDatasetDetail(ds.id);
      setSelected(detail);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(id) {
    await deleteDataset(id);
    if (selected && selected.id === id) setSelected(null);
    fetchDatasets();
  }

  if (selected) {
    if (detailLoading) return <LoadingSpinner message="Loading dataset details..." />;
    return <DataPreview dataset={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <PageHeader
        title="Upload Data"
        description="Upload your business data (CSV or Excel) to get started with analysis."
      />

      <FileUpload onUploadSuccess={handleUploadSuccess} />

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Your Datasets</h2>
        {loading ? (
          <LoadingSpinner message="Loading datasets..." />
        ) : (
          <DatasetList
            datasets={datasets}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

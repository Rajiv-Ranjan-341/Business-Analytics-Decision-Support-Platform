import { useState, useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import PageHeader from '../components/Shared/PageHeader';
import Panel from '../components/Shared/Panel';
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
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDatasets();
  }, []);

  async function fetchDatasets() {
    setLoading(true);
    try {
      const data = await listDatasets();
      setDatasets(data);
      setError(null);
    } catch {
      // Without this the list silently rendered its empty state when the backend
      // was down, telling the user they had no files when in fact nothing had been read.
      setError('Could not reach the server to list your files. Start the backend, then reload this page.');
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
      setError(null);
    } catch {
      setError(`Could not open ${ds.name}. Start the backend, then try again.`);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteDataset(id);
      if (selected && selected.id === id) setSelected(null);
      setError(null);
      // Only refetch when the removal actually worked. Refetching after a failure
      // re-ran the success path below, which calls setError(null) and wiped the
      // message before it could be read — leaving the file in the list unexplained.
      await fetchDatasets();
    } catch {
      setError('Could not remove that file. Start the backend, then try again.');
    }
  }

  // The spinner is checked before `selected` because the detail request finishes
  // and sets `selected` in the same commit — behind the old `if (selected)` guard
  // it could never render, so opening a file gave no feedback at all.
  if (detailLoading) return <LoadingSpinner message="Opening your file" />;

  if (selected) {
    return <DataPreview dataset={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <PageHeader
        title="Upload data"
        description="Bring in a CSV or Excel export from whatever till or spreadsheet you already keep. You say what the columns mean once, and every page reads from that."
      />

      <FileUpload onUploadSuccess={handleUploadSuccess} />

      {error && (
        <p
          role="alert"
          className="mt-8 flex items-start gap-2.5 border-l-[3px] border-warn bg-sheet py-3 pr-4 pl-3.5 text-sm text-ink"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      <div className="mt-8">
        <Panel
          title="Your files"
          description="Everything read in so far. Open one to check its columns before you trust the numbers built on it."
          bodyClassName="p-0"
        >
          {loading ? (
            <LoadingSpinner message="Looking for your files" />
          ) : (
            <DatasetList datasets={datasets} onSelect={handleSelect} onDelete={handleDelete} />
          )}
        </Panel>
      </div>
    </div>
  );
}

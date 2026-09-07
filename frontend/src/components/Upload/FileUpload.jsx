import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { uploadDataset } from '../../api/client';

export default function FileUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setUploading(true);
      setError(null);

      try {
        const result = await uploadDataset(file);
        onUploadSuccess(result);
      } catch (err) {
        const msg =
          err.response?.data?.detail || 'Upload failed. Please try again.';
        setError(msg);
      } finally {
        setUploading(false);
      }
    },
    [onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <>
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">Uploading and processing...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                {isDragActive ? (
                  <FileSpreadsheet size={28} className="text-blue-500" />
                ) : (
                  <Upload size={28} className="text-blue-500" />
                )}
              </div>
              <div>
                <p className="text-base font-medium text-gray-700">
                  {isDragActive
                    ? 'Drop your file here'
                    : 'Drag & drop your business data'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  CSV or Excel files up to 50MB
                </p>
              </div>
              <button className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                Browse Files
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, LoaderCircle, TriangleAlert, Upload } from 'lucide-react';
import Panel from '../Shared/Panel';
import { uploadDataset } from '../../api/client';

// Mirrors MAX_UPLOAD_SIZE_MB in backend/app/config.py. The server is the authority;
// this is only the figure we print so the user is told before they waste an upload.
const MAX_UPLOAD_MB = 50;

/**
 * The intake tray. It deliberately echoes the printer slot on the landing page —
 * the receipt feeds out there, the sales file feeds in here — rather than being a
 * dashed rounded rectangle. Kraft board on a ruled sheet; the day-glo sticker is
 * held back for the one moment a file is actually hovering over the target.
 */
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
          err.response?.data?.detail ||
          'The server could not read that file. Check it opens in a spreadsheet, then try again.';
        setError(msg);
      } finally {
        setUploading(false);
      }
    },
    [onUploadSuccess]
  );

  // Without this a rejected file did nothing at all — no upload, no message.
  const onDropRejected = useCallback((rejections) => {
    const name = rejections[0]?.file?.name;
    setError(
      rejections.length > 1
        ? 'Send one file at a time. Drop a single CSV or Excel export and it will be read straight away.'
        : `${name ? `“${name}” is` : 'That file is'} not a CSV or Excel export. Save it as .csv, .xlsx or .xls, then drop it here.`
    );
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <Panel
      title="Bring in a sales file"
      description={`A CSV or Excel export from your till or spreadsheet, up to ${MAX_UPLOAD_MB} MB. Nothing leaves this machine.`}
    >
      <div
        {...getRootProps({
          role: 'button',
          'aria-label': 'Choose a sales file to read, or drop one here',
          'aria-disabled': uploading || undefined,
          'aria-busy': uploading || undefined,
        })}
        className={`block w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
          uploading ? 'cursor-progress' : 'cursor-pointer'
        }`}
      >
        <input {...getInputProps()} />

        {/* The feed slot, straight off the printer on the landing page. */}
        <div className="h-1.5 bg-ink/75" aria-hidden="true" />

        <div
          className={`flex flex-col items-center gap-4 px-6 py-12 text-center transition-colors duration-150 ${
            isDragActive ? 'bg-sticker' : 'bg-kraft'
          }`}
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center bg-ink text-paper"
            aria-hidden="true"
          >
            {uploading ? (
              <LoaderCircle size={22} className="animate-spin motion-reduce:animate-none" />
            ) : isDragActive ? (
              <FileSpreadsheet size={22} />
            ) : (
              <Upload size={22} />
            )}
          </span>

          <div role="status" aria-live="polite">
            <p className="font-display text-2xl font-semibold text-ink">
              {uploading
                ? 'Reading your file'
                : isDragActive
                  ? 'Let go and it starts reading'
                  : 'Drop your sales file here'}
            </p>
            <p className="mt-1 text-sm text-ink/75">
              {uploading
                ? 'A big export can take a moment. Stay on this page.'
                : 'Or pick one from your computer.'}
            </p>
          </div>

          {!uploading && (
            /* Not a button: the whole tray is the control, so a nested button would
               be a second tab stop and a second accessible name for one action.
               Clicking here still opens the file dialog through the tray. */
            <span className="bg-ink px-6 py-3 font-display text-lg font-semibold tracking-wide text-paper">
              Choose a file
            </span>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2.5 border-l-[3px] border-warn bg-paper py-3 pr-4 pl-3.5 text-sm text-ink"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </Panel>
  );
}

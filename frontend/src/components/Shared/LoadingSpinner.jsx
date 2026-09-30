import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Reading your data' }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-ink/70"
      role="status"
      aria-live="polite"
    >
      <Loader2 size={28} className="mb-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

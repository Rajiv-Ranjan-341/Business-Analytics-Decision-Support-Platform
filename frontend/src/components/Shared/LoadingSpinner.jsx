import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <Loader2 size={32} className="animate-spin mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

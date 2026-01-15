import { useEffect, useState } from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
  autoHideDuration?: number;
}

export function ErrorToast({
  message,
  onDismiss,
  onRetry,
  autoHideDuration = 5000,
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onDismiss]);

  return (
    <div
      className={clsx(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform transition-all duration-300',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
    >
      <div className="flex items-center gap-3 rounded-lg bg-red-600 px-4 py-3 text-white shadow-lg">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
        <div className="flex items-center gap-1">
          {onRetry && (
            <button onClick={onRetry} className="rounded p-1 hover:bg-red-700" title="Retry">
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="rounded p-1 hover:bg-red-700"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

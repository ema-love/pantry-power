import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

export interface ToastOptions {
  message: string;
  tone?: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
  /** Milliseconds; defaults to 4.5s, or 7s when there is an action. */
  duration?: number;
}

interface ToastEntry extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((opts: ToastOptions) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback((opts: ToastOptions) => {
    const id = nextId.current++;
    // Keep at most two on screen so nothing piles up.
    setToasts((list) => [...list.slice(-1), { ...opts, id }]);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-64"
      >
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastEntry; onDismiss: () => void }) {
  const duration = toast.duration ?? (toast.action ? 7000 : 4500);
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onDismiss]);
  const Icon = toast.tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="toast-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-charcoal py-2.5 pl-4 pr-2 text-[0.95rem] text-ivory shadow-lift"
    >
      <Icon aria-hidden className={`h-5 w-5 shrink-0 ${toast.tone === 'error' ? 'text-[#F0A79F]' : 'text-sage'}`} />
      <p className="min-w-0 flex-1 py-1">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="min-h-10 shrink-0 rounded-xl px-3 font-bold text-sage hover:bg-white/10"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ivory/70 hover:bg-white/10">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return useMemo(() => ctx, [ctx]);
}

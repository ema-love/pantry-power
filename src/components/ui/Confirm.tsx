import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Sheet } from './Sheet';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false);
    setOpts(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={opts !== null}
        onClose={() => finish(false)}
        title={opts?.title ?? ''}
        initialFocusSelector="[data-confirm-cancel]"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" data-confirm-cancel onClick={() => finish(false)}>
              {opts?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant={opts?.danger ? 'danger' : 'primary'} onClick={() => finish(true)}>
              {opts?.confirmLabel}
            </Button>
          </div>
        }
      >
        <div className="text-base leading-relaxed text-stone-warm">{opts?.message}</div>
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}

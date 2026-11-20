import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Sticky action area at the bottom of the sheet. */
  footer?: ReactNode;
  /** Element to focus when opened; defaults to the first form field. */
  initialFocusSelector?: string;
}

/**
 * Accessible modal built on the native <dialog> element: focus is trapped,
 * Escape closes it, and the page behind cannot be scrolled.
 */
export function Sheet({ open, onClose, title, description, children, footer, initialFocusSelector }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const previouslyFocused = document.activeElement as HTMLElement | null;
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
      const target = initialFocusSelector
        ? dialog.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      // Only auto-focus inputs on larger screens; on phones this would pop the keyboard over the form.
      if (target) target.focus();
      else if (window.matchMedia('(min-width: 640px)').matches) {
        dialog.querySelector<HTMLElement>('input:not([type=hidden]):not([type=file]), select, textarea')?.focus();
      } else {
        dialog.querySelector<HTMLElement>('[data-sheet-close]')?.focus();
      }
      return () => {
        document.documentElement.style.overflow = '';
        previouslyFocused?.focus?.();
      };
    }
    if (!open && dialog.open) dialog.close();
  }, [open, initialFocusSelector]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, []);

  useEffect(() => {
    // Make sure the dialog is closed if the component unmounts while open.
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="sheet-panel flex max-h-[92dvh] flex-col rounded-t-3xl bg-ivory shadow-sheet sm:max-h-[86dvh] sm:rounded-3xl">
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden />
          <header className="flex items-start gap-3 px-5 pb-3 pt-3 sm:px-6 sm:pt-5">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-xl font-bold text-charcoal">
                {title}
              </h2>
              {description && (
                <div id={descId} className="mt-1 text-[0.95rem] text-stone-warm">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              data-sheet-close
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-warm hover:bg-cream"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-6">{children}</div>
          {footer && (
            <footer className="border-t border-line/70 bg-ivory px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:rounded-b-3xl sm:px-6 sm:pb-5">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}

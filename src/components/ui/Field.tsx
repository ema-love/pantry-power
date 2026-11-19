import { useId, type InputHTMLAttributes, type Ref, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { formatNumber } from '../../lib/format';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, error, hint, optional, children, className = '' }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-2 text-[0.95rem] font-semibold text-charcoal">
        {label}
        {optional && <span className="text-sm font-medium text-stone-light">Optional</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-stone-warm">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> & { ref?: Ref<HTMLInputElement>; label: string; error?: string; hint?: ReactNode; optional?: boolean };

export function TextField({ label, error, hint, optional, className, ...rest }: InputProps) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => <input id={id} className="input" aria-invalid={invalid} aria-describedby={describedBy} {...rest} />}
    </Field>
  );
}

export function DateField({ label, error, hint, optional, className, value, onChange, ...rest }: Omit<InputProps, 'onChange' | 'value'> & { value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="flex gap-2">
          <input
            id={id}
            type="date"
            className="input min-w-0 flex-1"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            {...rest}
          />
          {optional && value && (
            <button type="button" onClick={() => onChange('')} className="min-h-12 shrink-0 rounded-xl px-3 text-sm font-semibold text-stone-warm hover:bg-cream">
              Clear
            </button>
          )}
        </div>
      )}
    </Field>
  );
}

export function SelectField({ label, error, hint, optional, className, children, ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & { label: string; error?: string; hint?: ReactNode; optional?: boolean; className?: string }) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <select id={id} className="input appearance-none pr-10" aria-invalid={invalid} aria-describedby={describedBy} {...rest}>
            {children}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-warm" />
        </div>
      )}
    </Field>
  );
}

export function TextAreaField({ label, error, hint, optional, className, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & { label: string; error?: string; hint?: ReactNode; optional?: boolean; className?: string }) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} rows={3} className="input resize-y" aria-invalid={invalid} aria-describedby={describedBy} {...rest} />
      )}
    </Field>
  );
}

/** Numeric input with large − / + buttons so quantities can be set with taps instead of typing. */
export function QuantityField({
  label, value, onChange, error, hint, optional, step = 1, min = 0, max, className, suffix,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string; hint?: ReactNode; optional?: boolean;
  step?: number; min?: number; max?: number; className?: string; suffix?: ReactNode;
}) {
  const current = Number(value.replace(',', '.'));
  const bump = (dir: 1 | -1) => {
    const base = Number.isFinite(current) ? current : 0;
    let next = Math.round((base + dir * step) * 100) / 100;
    if (next < min) next = min;
    if (max !== undefined && next > max) next = max;
    onChange(formatNumber(next).replace(/,/g, ''));
  };
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="flex items-stretch gap-2">
          <button type="button" onClick={() => bump(-1)} aria-label={`Decrease ${label.toLowerCase()}`} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-charcoal hover:bg-cream">
            <Minus className="h-5 w-5" aria-hidden />
          </button>
          <div className="relative min-w-0 flex-1">
            <input
              id={id}
              inputMode="decimal"
              autoComplete="off"
              className="input tabular text-center text-lg font-bold"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <button type="button" onClick={() => bump(1)} aria-label={`Increase ${label.toLowerCase()}`} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-charcoal hover:bg-cream">
            <Plus className="h-5 w-5" aria-hidden />
          </button>
          {suffix}
        </div>
      )}
    </Field>
  );
}

import { Check } from 'lucide-react';

/** Large round tick target for marking things as bought. */
export function RoundCheck({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="group inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
          checked ? 'border-olive-600 bg-olive-600 text-ivory' : 'border-stone-light bg-white text-transparent group-hover:border-olive-500'
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
      </span>
    </button>
  );
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-center gap-4 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-charcoal">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-stone-warm">{description}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-olive-600 peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-olive-600"
      />
    </label>
  );
}

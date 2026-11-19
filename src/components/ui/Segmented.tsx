export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex rounded-2xl bg-cream p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-[0.95rem] font-semibold transition-colors ${
              active ? 'bg-white text-charcoal shadow-card' : 'text-stone-warm hover:text-charcoal'
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={`tabular rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-olive-100 text-olive-700' : 'bg-white/70 text-stone-warm'}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

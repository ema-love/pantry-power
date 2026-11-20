export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <rect width="512" height="512" rx="120" fill="#465B3D" />
      <path d="M156 214h200l-18 168a36 36 0 0 1-36 32H210a36 36 0 0 1-36-32z" fill="#FAF8F2" />
      <rect x="140" y="186" width="232" height="40" rx="20" fill="#A7B89A" />
      <path d="M256 168c0-44 28-72 72-76-2 44-28 72-72 76z" fill="#A7B89A" />
      <path d="M256 168c0-34-20-56-54-60 2 34 20 56 54 60z" fill="#B9795D" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-charcoal">Pantry Power</span>
    </div>
  );
}

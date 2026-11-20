import type { ReactNode } from 'react';
import { CalendarDays, House, Package, Settings, ShoppingBasket, type LucideIcon } from 'lucide-react';
import { useStore } from '../../state/store';
import { Link } from '../ui/Button';
import { Logo } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: House, match: (p) => p === '/' },
  { to: '/pantry', label: 'My Pantry', icon: Package, match: (p) => p.startsWith('/pantry') || p.startsWith('/alerts') },
  { to: '/shopping', label: 'Shopping', icon: ShoppingBasket, match: (p) => p.startsWith('/shopping') },
  { to: '/market', label: 'Market', icon: CalendarDays, match: (p) => p.startsWith('/market') },
  { to: '/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') },
];

export function AppShell({ path, children }: { path: string; children: ReactNode }) {
  const { data } = useStore();
  const toBuy = data.shoppingList.filter((s) => !s.isCompleted).length;

  return (
    <div className="min-h-dvh lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:shadow-lift">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line/80 bg-cream/60 px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.match(path);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold transition-colors ${
                  active ? 'bg-olive-600 text-ivory shadow-sm' : 'text-stone-warm hover:bg-white/70 hover:text-charcoal'
                }`}
              >
                <item.icon className="h-5 w-5" aria-hidden strokeWidth={2} />
                <span className="flex-1">{item.label}</span>
                {item.to === '/shopping' && toBuy > 0 && (
                  <span className={`tabular rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-white/20' : 'bg-terracotta text-white'}`}>{toBuy}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto px-3 text-xs leading-relaxed text-stone-light">
          Your pantry. Your stock.
          <br />
          Always in control.
        </p>
      </aside>

      <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-ivory/95 pb-safe backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map((item) => {
            const active = item.match(path);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1 text-[0.72rem] font-semibold transition-colors ${
                    active ? 'text-olive-700' : 'text-stone-warm'
                  }`}
                >
                  <span className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${active ? 'bg-olive-100' : ''}`}>
                    <item.icon className="h-[1.35rem] w-[1.35rem]" aria-hidden strokeWidth={active ? 2.3 : 1.9} />
                    {item.to === '/shopping' && toBuy > 0 && (
                      <span className="tabular absolute -right-0.5 -top-1 min-w-5 rounded-full bg-terracotta px-1 text-center text-[0.65rem] font-bold leading-5 text-white" aria-hidden>
                        {toBuy > 99 ? '99+' : toBuy}
                      </span>
                    )}
                  </span>
                  {item.label === 'My Pantry' ? 'Pantry' : item.label}
                  {item.to === '/shopping' && toBuy > 0 && <span className="sr-only">, {toBuy} to buy</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

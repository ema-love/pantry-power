import { useEffect, useState } from 'react';

/** Tiny hash router: works on any static host with no server configuration. */
export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = hash.split('?');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return { path: clean, segments: clean.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

let inAppNavigations = 0;

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  if (opts.replace) {
    history.replaceState(null, '', `#${to}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    inAppNavigations += 1;
    window.location.hash = to;
  }
}

/** Go back if we arrived here from inside the app, otherwise go to a sensible parent screen. */
export function goBack(fallback: string): void {
  if (inAppNavigations > 0) {
    inAppNavigations -= 1;
    window.history.back();
  } else {
    navigate(fallback, { replace: true });
  }
}

export function noteLinkNavigation(): void {
  inAppNavigations += 1;
}

export const href = (to: string) => `#${to}`;

'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The query string, read from the document rather than through
 * next/navigation's useSearchParams.
 *
 * useSearchParams opts a statically generated page out of prerendering: the
 * whole subtree becomes a Suspense fallback in the HTML and is replaced on
 * hydration, which is a large layout shift on exactly the pages that need to
 * be stable on a slow connection. Reading window.location instead lets the
 * comparison shell prerender at its real size, and the URL stays the source
 * of truth either way.
 *
 * The first render returns an empty set so server and client agree; the real
 * parameters arrive in the effect, before paint.
 */
export function useUrlSearchParams(): [URLSearchParams, () => void] {
  const [params, setParams] = useState<URLSearchParams>(() => new URLSearchParams());

  const sync = useCallback(() => {
    if (typeof window === 'undefined') return;
    setParams(new URLSearchParams(window.location.search));
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [sync]);

  return [params, sync];
}

/** Single parameter, for the pages that only need one. */
export function useUrlParam(name: string): string | null {
  const [params] = useUrlSearchParams();
  return params.get(name);
}

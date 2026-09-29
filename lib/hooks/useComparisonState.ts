'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CORRIDORS, getCorridor } from '../corridors';
import { formatAmountInput, parseAmountInput } from '../format';
import type { CorridorMeta, ScenarioId } from '../types';
import { useDebouncedValue } from './useDebouncedValue';
import { useUrlSearchParams } from './useUrlSearchParams';

const AMOUNT_DEBOUNCE_MS = 300;

const SCENARIOS = new Set<string>([
  'default',
  'all-fail',
  'all-timeout',
  'single-provider',
  'zero-dispersion',
  'extreme-dispersion',
  'expired',
]);

export interface ComparisonState {
  corridor: CorridorMeta;
  /** What the field shows, grouped as the user types. */
  amountInput: string;
  /** The committed decimal string, debounced. Null while the field is empty. */
  amount: string | null;
  setAmountInput: (raw: string) => void;
  setCorridor: (slug: string) => void;
  seed: string | undefined;
  scenario: ScenarioId | undefined;
  /** False until the URL has been read. Hold off quoting until it is true. */
  ready: boolean;
}

/**
 * The URL is the source of truth for the comparison. Corridor and amount live
 * in the path and query string so every comparison is shareable and every
 * corridor page is indexable; nothing about the comparison is held only in
 * component state.
 *
 * In "path" mode the corridor is the route segment (/compare/ngn-usdt) and
 * only the amount is a query parameter. In "query" mode — the homepage — both
 * are query parameters, so changing the corridor does not navigate away.
 */
export function useComparisonState(options: {
  corridorFromPath?: CorridorMeta;
  mode: 'path' | 'query';
}): ComparisonState {
  const { corridorFromPath, mode } = options;
  const router = useRouter();
  const pathname = usePathname();
  const [searchParams, syncParams] = useUrlSearchParams();

  // The query string is empty until the first effect reads it, so the server
  // render and the first client render agree and nothing shifts.
  const [adopted, setAdopted] = useState(false);
  useEffect(() => setAdopted(true), []);

  // A corridor change in path mode is a client navigation, which does not
  // raise popstate. Re-read the query string whenever the route changes.
  useEffect(() => {
    syncParams();
  }, [pathname, syncParams]);

  const corridor = useMemo(() => {
    if (mode === 'path' && corridorFromPath) return corridorFromPath;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    return (
      getCorridor(from && to ? `${from}-${to}` : null) ??
      corridorFromPath ??
      (CORRIDORS[0] as CorridorMeta)
    );
  }, [mode, corridorFromPath, searchParams]);

  const urlAmount = searchParams.get('amount');
  const defaultCorridor = corridorFromPath ?? (CORRIDORS[0] as CorridorMeta);

  const [amountInput, setAmountInputState] = useState(() =>
    formatAmountInput(defaultCorridor.defaultAmount),
  );
  const debouncedInput = useDebouncedValue(amountInput, AMOUNT_DEBOUNCE_MS);
  const amount = parseAmountInput(debouncedInput);

  /** The last value this hook wrote, so it does not react to its own writes. */
  const lastWritten = useRef<string | null>(null);

  const writeUrl = useCallback(
    (next: { corridorSlug?: string; amount?: string | null }) => {
      const params = new URLSearchParams(window.location.search);

      if (next.amount === null || next.amount === '') params.delete('amount');
      else if (next.amount !== undefined) params.set('amount', next.amount);

      const slug = next.corridorSlug ?? corridor.slug;

      if (mode === 'query') {
        const [from, to] = slug.split('-');
        if (from && to) {
          params.set('from', from);
          params.set('to', to);
        }
      } else if (next.corridorSlug && next.corridorSlug !== corridor.slug) {
        // A different corridor is a different page, so this one navigates.
        const query = params.toString();
        router.replace(query ? `/compare/${slug}?${query}` : `/compare/${slug}`, {
          scroll: false,
        });
        return;
      }

      const query = params.toString();
      window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
      syncParams();
    },
    [corridor.slug, mode, pathname, router, syncParams],
  );

  // Adopt an amount that arrived in the URL — a shared link, the back button,
  // or a link to this same route with a different amount.
  useEffect(() => {
    if (!adopted || urlAmount === null) return;
    if (urlAmount === lastWritten.current) return;
    if (urlAmount === parseAmountInput(amountInput)) return;
    setAmountInputState(formatAmountInput(urlAmount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlAmount, adopted]);

  // Commit the debounced amount to the URL, never the raw keystroke. Held
  // until the URL has been read, so a shared link is never overwritten by the
  // default amount before we have seen it.
  useEffect(() => {
    if (!adopted) return;
    const committed = parseAmountInput(debouncedInput);
    if (committed === urlAmount) return;
    lastWritten.current = committed;
    writeUrl({ amount: committed });
    // writeUrl changes identity with the params this effect updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInput, adopted]);

  const setAmountInput = useCallback((raw: string) => {
    setAmountInputState(formatAmountInput(raw));
  }, []);

  const setCorridor = useCallback(
    (slug: string) => {
      const next = getCorridor(slug);
      if (!next) return;
      writeUrl({ corridorSlug: next.slug, amount: parseAmountInput(amountInput) });
    },
    [amountInput, writeUrl],
  );

  const seedParam = searchParams.get('seed');
  const scenarioParam = searchParams.get('scenario');

  return {
    corridor,
    amountInput,
    amount,
    setAmountInput,
    setCorridor,
    seed: seedParam ?? undefined,
    scenario:
      scenarioParam && SCENARIOS.has(scenarioParam) ? (scenarioParam as ScenarioId) : undefined,
    ready: adopted,
  };
}

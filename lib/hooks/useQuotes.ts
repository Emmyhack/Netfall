'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { streamQuotes } from '../quotes/source';
import { rankQuotes } from '../quotes/ranking';
import { dispersionBps } from '../money';
import type {
  Quote,
  QuoteError,
  QuoteResponse,
  ScenarioId,
  UnavailableQuote,
} from '../types';

export type QuoteStatus = 'idle' | 'loading' | 'partial' | 'settled' | 'error';

export interface QuoteState {
  status: QuoteStatus;
  /** Ranked by landed amount at every point, including mid-stream. */
  quotes: Quote[];
  unavailable: UnavailableQuote[];
  response: QuoteResponse | null;
  error: QuoteError | null;
  requestId: string | null;
  expected: number;
  received: number;
  /** Live dispersion across whatever has arrived so far. */
  dispersionBps: number;
  expiresAt: string | null;
  generatedAt: string | null;
  expired: boolean;
  msRemaining: number | null;
  /** A same-inputs re-fetch is streaming in behind the visible figures. */
  refreshing: boolean;
  refresh: () => void;
}

export interface UseQuotesInput {
  corridor: string;
  amount: string | null;
  seed?: string | undefined;
  scenario?: ScenarioId | undefined;
  /** Set false to hold off, e.g. while the amount is still being typed. */
  enabled?: boolean;
}

interface InternalState {
  status: QuoteStatus;
  quotes: Quote[];
  unavailable: UnavailableQuote[];
  response: QuoteResponse | null;
  error: QuoteError | null;
  requestId: string | null;
  expected: number;
  generatedAt: string | null;
  expiresAt: string | null;
  refreshing: boolean;
}

const INITIAL: InternalState = {
  status: 'idle',
  quotes: [],
  unavailable: [],
  response: null,
  error: null,
  requestId: null,
  expected: 0,
  generatedAt: null,
  expiresAt: null,
  refreshing: false,
};

/**
 * A quote born with less life than this never auto-renews: a provider whose
 * responses arrive expired (or a skewed clock upstream) would otherwise turn
 * auto-refresh into a fetch loop. It falls back to the manual banner instead.
 */
const MIN_HONEST_LIFETIME_MS = 5000;

/**
 * Subscribes to the quote stream and keeps a ranked, partially-filled view of
 * it. Providers resolve one at a time, so rows can render as they land rather
 * than waiting for the slowest one.
 */
export function useQuotes({
  corridor,
  amount,
  seed,
  scenario,
  enabled = true,
}: UseQuotesInput): QuoteState {
  const [state, setState] = useState<InternalState>(INITIAL);
  const [nonce, setNonce] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const cancelRef = useRef<(() => void) | null>(null);
  const refreshingRef = useRef(false);

  const refresh = useCallback(() => {
    refreshingRef.current = true;
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    cancelRef.current?.();

    if (!enabled || amount === null) {
      setState(INITIAL);
      return;
    }

    // A refresh over identical inputs keeps the settled board on screen and
    // streams the replacement in behind it; the swap happens whole, at
    // 'settled', so the table never flashes back to skeletons. Anything else
    // (first load, corridor or amount change, retry out of an error) starts
    // clean because the visible figures would belong to different inputs.
    const carryOver = refreshingRef.current;
    refreshingRef.current = false;
    setState((previous) =>
      carryOver && previous.status === 'settled' && previous.quotes.length > 0
        ? { ...previous, refreshing: true }
        : { ...INITIAL, status: 'loading' },
    );

    const cancel = streamQuotes({ corridor, amount, seed, scenario }, (event) => {
      setState((previous) => {
        // Mid-stream events never disturb a board held through a refresh;
        // it swaps wholesale at 'settled' or surrenders to 'error'.
        if (previous.refreshing && (event.type === 'quote' || event.type === 'unavailable')) {
          return previous;
        }
        switch (event.type) {
          case 'started':
            return {
              ...previous,
              status: previous.refreshing ? previous.status : 'loading',
              requestId: event.requestId,
              expected: event.expected,
            };
          case 'quote':
            return {
              ...previous,
              status: 'partial',
              quotes: rankQuotes([...previous.quotes, event.quote]),
            };
          case 'unavailable':
            return {
              ...previous,
              status: 'partial',
              unavailable: [...previous.unavailable, event.entry],
            };
          case 'settled':
            return {
              ...previous,
              status: 'settled',
              refreshing: false,
              response: event.response,
              quotes: event.response.quotes,
              unavailable: event.response.unavailable,
              generatedAt: event.response.generatedAt,
              expiresAt: event.response.expiresAt,
            };
          case 'error':
            return { ...previous, status: 'error', refreshing: false, error: event.error };
        }
      });
    });

    cancelRef.current = cancel;
    return cancel;
  }, [corridor, amount, seed, scenario, enabled, nonce]);

  // One shared ticker drives the expiry countdown.
  useEffect(() => {
    if (!state.expiresAt) return;
    setNow(Date.now());
    const handle = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(handle);
  }, [state.expiresAt]);

  const msRemaining = useMemo(() => {
    if (!state.expiresAt) return null;
    return new Date(state.expiresAt).getTime() - now;
  }, [state.expiresAt, now]);

  const expired = msRemaining !== null && msRemaining <= 0;

  // Expiry renews itself: prices refresh automatically instead of asking for
  // a click. A quote that never had an honest lifetime is left to the manual
  // banner, and so is a failed renewal, which lands in 'error' and stops here.
  const autoRenews = useMemo(() => {
    if (!expired || state.status !== 'settled' || !state.generatedAt || !state.expiresAt) {
      return false;
    }
    const lifetime = new Date(state.expiresAt).getTime() - new Date(state.generatedAt).getTime();
    return lifetime >= MIN_HONEST_LIFETIME_MS;
  }, [expired, state.status, state.generatedAt, state.expiresAt]);

  useEffect(() => {
    if (!autoRenews || state.refreshing) return;
    // A hidden tab holds off until it is looked at again.
    if (document.visibilityState === 'hidden') {
      const onVisible = () => {
        if (document.visibilityState === 'visible') refresh();
      };
      document.addEventListener('visibilitychange', onVisible);
      return () => document.removeEventListener('visibilitychange', onVisible);
    }
    refresh();
    return undefined;
  }, [autoRenews, state.refreshing, refresh]);

  const liveDispersion = useMemo(
    () => state.response?.dispersionBps ?? dispersionBps(state.quotes.map((q) => q.landedAmount)),
    [state.response, state.quotes],
  );

  return {
    status: state.status,
    quotes: state.quotes,
    unavailable: state.unavailable,
    response: state.response,
    error: state.error,
    requestId: state.requestId,
    expected: state.expected,
    received: state.quotes.length + state.unavailable.length,
    dispersionBps: liveDispersion,
    expiresAt: state.expiresAt,
    generatedAt: state.generatedAt,
    expired,
    msRemaining,
    // True from the first expired render, so the manual banner never
    // flashes (or gets announced) in the frame before the renewal starts.
    refreshing: state.refreshing || autoRenews,
    refresh,
  };
}

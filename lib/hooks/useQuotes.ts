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
};

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

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    cancelRef.current?.();

    if (!enabled || amount === null) {
      setState(INITIAL);
      return;
    }

    setState({ ...INITIAL, status: 'loading' });

    const cancel = streamQuotes({ corridor, amount, seed, scenario }, (event) => {
      setState((previous) => {
        switch (event.type) {
          case 'started':
            return {
              ...previous,
              status: 'loading',
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
              response: event.response,
              quotes: event.response.quotes,
              unavailable: event.response.unavailable,
              generatedAt: event.response.generatedAt,
              expiresAt: event.response.expiresAt,
            };
          case 'error':
            return { ...previous, status: 'error', error: event.error };
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
    expired: msRemaining !== null && msRemaining <= 0,
    msRemaining,
    refresh,
  };
}

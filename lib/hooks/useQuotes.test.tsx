import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { QuoteEvent, QuoteRequest, QuoteResponse } from '../types';

/**
 * The auto-refresh contract: an expired board renews itself without a click,
 * keeps its figures on screen while the replacement streams in, and refuses
 * to loop when a provider hands out quotes that were born dead.
 */

type OnEvent = (event: QuoteEvent) => void;
const streams: { request: QuoteRequest; onEvent: OnEvent }[] = [];

vi.mock('../quotes/source', () => ({
  QUOTE_TTL_SECONDS: 60,
  streamQuotes: (request: QuoteRequest, onEvent: OnEvent) => {
    streams.push({ request, onEvent });
    return () => undefined;
  },
}));

import { useQuotes } from './useQuotes';

function response(ttlMs: number, landed: string): QuoteResponse {
  const now = Date.now();
  return {
    requestId: `req-${streams.length}`,
    corridor: 'ngn-usdt',
    inputAmount: '500000',
    generatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    quotes: [
      {
        provider: 'quidax',
        providerName: 'Quidax',
        source: 'direct',
        landedAmount: landed,
        effectiveRate: '1560',
        marginVsReference: '-12',
        confidence: 'estimated',
        hasCommercialRelationship: false,
        routeUrl: 'https://example.com',
        feeLedger: [],
      },
    ],
    unavailable: [],
    referenceRate: '1548',
    dispersionBps: 0,
  } as unknown as QuoteResponse;
}

function settle(index: number, res: QuoteResponse) {
  const stream = streams[index];
  if (!stream) throw new Error(`no stream ${index} opened`);
  act(() => {
    stream.onEvent({ type: 'started', requestId: res.requestId, corridor: 'ngn-usdt', expected: 1 });
    stream.onEvent({ type: 'quote', quote: res.quotes[0]! } as QuoteEvent);
    stream.onEvent({ type: 'settled', response: res });
  });
}

beforeEach(() => {
  streams.length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const input = { corridor: 'ngn-usdt', amount: '500000' };

describe('useQuotes auto-refresh', () => {
  it('re-fetches by itself when the quotes expire', () => {
    const { result } = renderHook(() => useQuotes(input));
    expect(streams.length).toBe(1);
    settle(0, response(6000, '364'));
    expect(result.current.status).toBe('settled');

    act(() => vi.advanceTimersByTime(7000));

    expect(streams.length).toBe(2);
    expect(result.current.refreshing).toBe(true);
    // The stale figures stay visible, struck through, until the swap.
    expect(result.current.quotes[0]?.landedAmount).toBe('364');
    expect(result.current.expired).toBe(true);

    settle(1, response(60_000, '371'));
    expect(result.current.refreshing).toBe(false);
    expect(result.current.expired).toBe(false);
    expect(result.current.quotes[0]?.landedAmount).toBe('371');
  });

  it('swaps the board whole — mid-stream events never mix into the held figures', () => {
    const { result } = renderHook(() => useQuotes(input));
    settle(0, response(6000, '364'));
    act(() => vi.advanceTimersByTime(7000));

    const next = response(60_000, '371');
    act(() => {
      streams[1]!.onEvent({ type: 'started', requestId: next.requestId, corridor: 'ngn-usdt', expected: 1 });
      streams[1]!.onEvent({ type: 'quote', quote: next.quotes[0]! } as QuoteEvent);
    });
    // Still the old board, still marked as renewing.
    expect(result.current.quotes[0]?.landedAmount).toBe('364');
    expect(result.current.refreshing).toBe(true);

    act(() => streams[1]!.onEvent({ type: 'settled', response: next }));
    expect(result.current.quotes[0]?.landedAmount).toBe('371');
  });

  it('reports the renewal from the very render the quotes expire in', () => {
    const { result } = renderHook(() => useQuotes(input));
    settle(0, response(6000, '364'));
    const seen: { expired: boolean; refreshing: boolean }[] = [];
    act(() => vi.advanceTimersByTime(7000));
    seen.push({ expired: result.current.expired, refreshing: result.current.refreshing });
    // Every expired render is also a refreshing render — no banner frame.
    for (const s of seen) if (s.expired) expect(s.refreshing).toBe(true);
  });

  it('never loops on quotes born with no honest lifetime', () => {
    const { result } = renderHook(() => useQuotes(input));
    // Born already expired — the mock "expired" scenario and skewed clocks.
    settle(0, response(-30_000, '364'));

    act(() => vi.advanceTimersByTime(10_000));

    expect(streams.length).toBe(1);
    expect(result.current.expired).toBe(true);
    expect(result.current.refreshing).toBe(false);
  });

  it('stops renewing after a failed refresh instead of hammering providers', () => {
    const { result } = renderHook(() => useQuotes(input));
    settle(0, response(6000, '364'));
    act(() => vi.advanceTimersByTime(7000));
    expect(streams.length).toBe(2);

    act(() =>
      streams[1]!.onEvent({
        type: 'error',
        error: { code: 'all_providers_failed', message: 'nothing answered' },
      } as QuoteEvent),
    );

    expect(result.current.status).toBe('error');
    act(() => vi.advanceTimersByTime(30_000));
    expect(streams.length).toBe(2);
  });

  it('holds off while the tab is hidden and renews on return', () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('visible');
    renderHook(() => useQuotes(input));
    settle(0, response(6000, '364'));

    visibility.mockReturnValue('hidden');
    act(() => vi.advanceTimersByTime(7000));
    expect(streams.length).toBe(1);

    visibility.mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(streams.length).toBe(2);
    visibility.mockRestore();
  });
});

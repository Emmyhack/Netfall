import { dispersionBps, isValidDecimalString } from '../money';
import { rankQuotes } from './ranking';
import { getCorridor, nearestCorridor } from '../corridors';
import { providersFor } from '../live/registry-core';
import type {
  Quote,
  QuoteEvent,
  QuoteRequest,
  QuoteResponse,
  UnavailableQuote,
} from '../types';

/**
 * The single seam between the app and where its data comes from.
 *
 * The data is live. Quotes fan out to /api/v1/quote/[provider], one request
 * per integrated venue, so rows arrive as each answers and one venue's
 * outage cannot hold the rest hostage. Providers without a live integration
 * are reported immediately as not_configured — absence is information.
 *
 * The mock engine still exists, but only for development and tests: it runs
 * exclusively when a scenario or seed parameter is present outside
 * production, which is what the /_dev harnesses send. Production ignores
 * those parameters entirely and never loads the mock.
 */

export const QUOTE_TTL_SECONDS = 60;

/** Client-side guard rail for a hung route, per provider. */
const CLIENT_TIMEOUT_MS = 12000;

export type Unsubscribe = () => void;

export function streamQuotes(
  request: QuoteRequest,
  onEvent: (event: QuoteEvent) => void,
): Unsubscribe {
  // The build-time constant leads so the production minifier folds this to
  // streamFromLive and drops the mock streaming code from the bundle.
  if (
    process.env.NODE_ENV !== 'production' &&
    (request.scenario !== undefined || request.seed !== undefined)
  ) {
    return streamFromMock(request, onEvent);
  }
  return streamFromLive(request, onEvent);
}

/* -------------------------------------------------------------------------- */
/* Live                                                                        */
/* -------------------------------------------------------------------------- */

function streamFromLive(request: QuoteRequest, onEvent: (event: QuoteEvent) => void): Unsubscribe {
  let cancelled = false;
  const aborters: AbortController[] = [];

  const corridor = getCorridor(request.corridor);
  if (!corridor) {
    const handle = setTimeout(() => {
      onEvent({
        type: 'error',
        error: {
          code: 'corridor_unsupported',
          message: `Netfall does not track ${request.corridor.toUpperCase().replace('-', ' to ')} yet.`,
          suggestion: nearestCorridor(request.corridor).slug,
        },
      });
    }, 0);
    return () => clearTimeout(handle);
  }

  if (!isValidDecimalString(request.amount)) {
    const handle = setTimeout(() => {
      onEvent({ type: 'error', error: { code: 'amount_invalid', message: 'Enter an amount to compare.' } });
    }, 0);
    return () => clearTimeout(handle);
  }

  const providers = providersFor(corridor.slug);
  const quotes: Quote[] = [];
  const unavailable: UnavailableQuote[] = [];
  let remaining = providers.length;
  let earliestExpiry: number | null = null;

  const requestId = `req_${Date.now().toString(36)}`;
  onEvent({ type: 'started', requestId, corridor: corridor.id, expected: providers.length });

  const settleIfDone = (): void => {
    if (cancelled || remaining > 0) return;
    const ranked = rankQuotes(quotes);
    const now = Date.now();
    onEvent({
      type: 'settled',
      response: {
        requestId,
        corridor: corridor.id,
        inputAmount: request.amount,
        generatedAt: new Date(now).toISOString(),
        expiresAt: new Date(earliestExpiry ?? now + QUOTE_TTL_SECONDS * 1000).toISOString(),
        dispersionBps: dispersionBps(ranked.map((q) => q.landedAmount)),
        quotes: ranked,
        unavailable: [...unavailable],
      },
    });
  };

  const miss = (provider: (typeof providers)[number], reason: UnavailableQuote['reason']): void => {
    if (cancelled) return;
    const entry = { provider: provider.slug, providerName: provider.name, reason };
    unavailable.push(entry);
    onEvent({ type: 'unavailable', entry });
    remaining -= 1;
    settleIfDone();
  };

  for (const provider of providers) {
    if (!provider.integrated) {
      // Known immediately; no request needed and no fake latency added.
      const handle = setTimeout(() => miss(provider, 'not_configured'), 0);
      request.signal?.addEventListener('abort', () => clearTimeout(handle), { once: true });
      continue;
    }

    const aborter = new AbortController();
    aborters.push(aborter);
    const timer = setTimeout(() => aborter.abort(), CLIENT_TIMEOUT_MS);

    fetch(
      `/api/v1/quote/${provider.slug}?corridor=${corridor.slug}&amount=${encodeURIComponent(request.amount)}`,
      { signal: aborter.signal },
    )
      .then(async (response) => {
        clearTimeout(timer);
        if (cancelled) return;
        if (!response.ok) return miss(provider, 'provider_down');

        const payload = (await response.json()) as {
          result?: { kind: string; quote?: Quote; reason?: UnavailableQuote['reason'] };
          expiresAt?: string;
        };

        const expires = payload.expiresAt ? new Date(payload.expiresAt).getTime() : NaN;
        if (Number.isFinite(expires)) {
          earliestExpiry = earliestExpiry === null ? expires : Math.min(earliestExpiry, expires);
        }

        if (payload.result?.kind === 'quote' && payload.result.quote) {
          quotes.push(payload.result.quote);
          onEvent({ type: 'quote', quote: payload.result.quote });
          remaining -= 1;
          settleIfDone();
          return;
        }
        miss(provider, payload.result?.reason ?? 'provider_down');
      })
      .catch(() => {
        clearTimeout(timer);
        if (!cancelled) miss(provider, 'timeout');
      });
  }

  const cancel: Unsubscribe = () => {
    cancelled = true;
    for (const aborter of aborters) aborter.abort();
  };
  request.signal?.addEventListener('abort', cancel, { once: true });
  return cancel;
}

/* -------------------------------------------------------------------------- */
/* Development and tests: the adversarial mock, behind scenario/seed only     */
/* -------------------------------------------------------------------------- */

function streamFromMock(request: QuoteRequest, onEvent: (event: QuoteEvent) => void): Unsubscribe {
  let cancelled = false;
  let cancelPlan: (() => void) | null = null;

  import('../mock/engine')
    .then(({ buildPlan, assembleResponse }) => {
      if (cancelled) return;
      const planned = buildPlan(request);
      if (!planned.ok) {
        onEvent({ type: 'error', error: planned.error });
        return;
      }

      const { plan } = planned;
      const timers: ReturnType<typeof setTimeout>[] = [];
      const quotes: Quote[] = [];
      const unavailable: UnavailableQuote[] = [];
      let remaining = plan.outcomes.length;

      onEvent({
        type: 'started',
        requestId: plan.requestId,
        corridor: plan.corridor.id,
        expected: plan.outcomes.length,
      });

      const finishIfDone = (): void => {
        if (cancelled || remaining > 0) return;
        onEvent({ type: 'settled', response: assembleResponse(plan, quotes, unavailable) });
      };

      if (plan.outcomes.length === 0) timers.push(setTimeout(finishIfDone, 0));

      for (const outcome of plan.outcomes) {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            if (outcome.result.kind === 'quote') {
              quotes.push(outcome.result.quote);
              onEvent({ type: 'quote', quote: outcome.result.quote });
            } else {
              unavailable.push(outcome.result.entry);
              onEvent({ type: 'unavailable', entry: outcome.result.entry });
            }
            remaining -= 1;
            finishIfDone();
          }, outcome.latencyMs),
        );
      }

      cancelPlan = () => {
        for (const handle of timers) clearTimeout(handle);
      };
    })
    .catch(() => {
      if (!cancelled) {
        onEvent({
          type: 'error',
          error: { code: 'network', message: 'Could not load the development mock.' },
        });
      }
    });

  const cancel: Unsubscribe = () => {
    cancelled = true;
    cancelPlan?.();
  };
  request.signal?.addEventListener('abort', cancel, { once: true });
  return cancel;
}

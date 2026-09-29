import { buildPlan, assembleResponse, QUOTE_TTL_SECONDS } from '../mock/engine';
import { MOCK_PROVIDERS } from '../mock/providers';
import type {
  ProviderProfile,
  Quote,
  QuoteEvent,
  QuoteRequest,
  QuoteResponse,
  UnavailableQuote,
} from '../types';

/**
 * The single seam between the app and wherever its data comes from.
 *
 * Today everything below resolves a seeded mock plan on timers. When the
 * quote engine exists, this file becomes a set of fetches and nothing above
 * it — components, hooks, pages, tests — changes. It is the only module in
 * the application that imports lib/mock; the development harnesses and the
 * mock's own tests are the deliberate exceptions.
 *
 * LIVE: replace the four function bodies below with calls to the engine.
 *   streamQuotes        -> GET /v1/quote, streamed
 *   fetchQuotes         -> the same call, awaited
 *   sampleCorridor      -> GET /v1/coverage/{corridor}, at build time
 *   listProviders       -> GET /v1/providers
 * Keep the QuoteEvent sequence identical: one `started`, then one `quote` or
 * `unavailable` per provider as it resolves, then exactly one `settled` or
 * `error`.
 */

export { QUOTE_TTL_SECONDS };

export type Unsubscribe = () => void;

export function streamQuotes(request: QuoteRequest, onEvent: (event: QuoteEvent) => void): Unsubscribe {
  const planned = buildPlan(request);

  if (!planned.ok) {
    // Errors still arrive asynchronously, so consumers have one code path.
    const handle = setTimeout(() => onEvent({ type: 'error', error: planned.error }), 0);
    return () => clearTimeout(handle);
  }

  const { plan } = planned;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

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

  if (plan.outcomes.length === 0) {
    const handle = setTimeout(finishIfDone, 0);
    timers.push(handle);
  }

  for (const outcome of plan.outcomes) {
    const handle = setTimeout(() => {
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
    }, outcome.latencyMs);
    timers.push(handle);
  }

  const cancel: Unsubscribe = () => {
    cancelled = true;
    for (const handle of timers) clearTimeout(handle);
  };

  request.signal?.addEventListener('abort', cancel, { once: true });

  return cancel;
}

/** Whole-response convenience. Used by static generation and tests. */
export function fetchQuotes(request: QuoteRequest): Promise<QuoteResponse> {
  return new Promise((resolve, reject) => {
    const cancel = streamQuotes(request, (event) => {
      if (event.type === 'settled') {
        cancel();
        resolve(event.response);
      } else if (event.type === 'error') {
        cancel();
        reject(event.error);
      }
    });
  });
}

/**
 * Resolves a plan with no latency at all. Static pages need corridor figures
 * at build time, where waiting on simulated provider timers is pointless.
 *
 * LIVE: this becomes a plain server-side call to the engine.
 */
export function fetchQuotesImmediate(request: QuoteRequest): QuoteResponse | { error: true; message: string } {
  const planned = buildPlan(request);
  if (!planned.ok) return { error: true, message: planned.error.message };
  const quotes: Quote[] = [];
  const unavailable: UnavailableQuote[] = [];
  for (const outcome of planned.plan.outcomes) {
    if (outcome.result.kind === 'quote') quotes.push(outcome.result.quote);
    else unavailable.push(outcome.result.entry);
  }
  return assembleResponse(planned.plan, quotes, unavailable);
}

/* -------------------------------------------------------------------------- */
/* Build-time reads                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A representative comparison for a corridor, used to generate the coverage
 * figures and the per-corridor copy on statically generated pages. Seeded, so
 * a given build always says the same thing.
 *
 * LIVE: GET /v1/coverage/{corridor}, which reports the observed dispersion
 * over a recent window rather than one sampled request.
 */
export function sampleCorridor(
  corridorSlug: string,
  amount: string,
  seed: string,
): QuoteResponse | null {
  const result = fetchQuotesImmediate({ corridor: corridorSlug, amount, seed });
  return 'error' in result ? null : result;
}

/**
 * The provider directory: who we track, how we reach them, and where we earn
 * a commission. Drives the disclosure page, so it must never be a hand-written
 * list that can drift from what the comparison actually uses.
 *
 * LIVE: GET /v1/providers.
 */
export function listProviders(): ProviderProfile[] {
  return MOCK_PROVIDERS.map((provider) => ({
    slug: provider.slug,
    name: provider.name,
    source: provider.source,
    hasCommercialRelationship: provider.hasCommercialRelationship,
    routeUrlTemplate: provider.routeUrlTemplate,
  }));
}

export function findProvider(slug: string): ProviderProfile | null {
  return listProviders().find((provider) => provider.slug === slug) ?? null;
}

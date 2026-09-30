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
 * the application that touches lib/mock; the development harnesses and the
 * mock's own tests are the deliberate exceptions.
 *
 * The mock is loaded with a dynamic import, never statically. It stands in
 * for a network service, so it enters the page the way the service would: at
 * the moment of the first request, off the critical path. Statically imported
 * it rode in every page's first-load JavaScript — six kilobytes of provider
 * registry and pricing logic that production will never ship, paid before a
 * single figure was on screen.
 *
 * LIVE: replace the function bodies below with calls to the engine.
 *   streamQuotes        -> GET /v1/quote, streamed
 *   fetchQuotes         -> the same call, awaited
 *   sampleCorridor      -> GET /v1/coverage/{corridor}, at build time
 *   listProviders       -> GET /v1/providers
 * Keep the QuoteEvent sequence identical: one `started`, then one `quote` or
 * `unavailable` per provider as it resolves, then exactly one `settled` or
 * `error`.
 */

export const QUOTE_TTL_SECONDS = 90;

const engine = () => import('../mock/engine');
const providers = () => import('../mock/providers');

export type Unsubscribe = () => void;

export function streamQuotes(request: QuoteRequest, onEvent: (event: QuoteEvent) => void): Unsubscribe {
  let cancelled = false;
  let cancelPlan: (() => void) | null = null;

  engine()
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

      if (plan.outcomes.length === 0) {
        timers.push(setTimeout(finishIfDone, 0));
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

      cancelPlan = () => {
        for (const handle of timers) clearTimeout(handle);
      };
    })
    .catch(() => {
      if (!cancelled) {
        onEvent({
          type: 'error',
          error: { code: 'network', message: 'Could not reach the pricing service.' },
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

/* -------------------------------------------------------------------------- */
/* Build-time reads                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A representative comparison for a corridor, used to generate the coverage
 * figures and the per-corridor copy on statically generated pages. Seeded, so
 * a given build always says the same thing.
 *
 * LIVE: GET /v1/coverage/{corridor}.
 */
export async function sampleCorridor(
  corridorSlug: string,
  amount: string,
  seed: string,
): Promise<QuoteResponse | null> {
  const { buildPlan, resolvePlan } = await engine();
  const planned = buildPlan({ corridor: corridorSlug, amount, seed });
  if (!planned.ok) return null;
  return resolvePlan(planned.plan);
}

/**
 * The provider directory: who we track, how we reach them, and where we earn
 * a commission. Drives the disclosure page, so it must never be a hand-written
 * list that can drift from what the comparison actually uses.
 *
 * LIVE: GET /v1/providers.
 */
export async function listProviders(): Promise<ProviderProfile[]> {
  const { MOCK_PROVIDERS } = await providers();
  return MOCK_PROVIDERS.map((provider) => ({
    slug: provider.slug,
    name: provider.name,
    source: provider.source,
    hasCommercialRelationship: provider.hasCommercialRelationship,
    routeUrlTemplate: provider.routeUrlTemplate,
  }));
}

import { getCorridor, nearestCorridor } from '../corridors';
import {
  compare,
  dispersionBps,
  divide,
  greaterThan,
  isValidDecimalString,
  lessThan,
  multiply,
  negate,
  round,
  sum,
  type Money,
} from '../money';
import type {
  CorridorMeta,
  FeeLine,
  Quote,
  QuoteError,
  QuoteRequest,
  QuoteResponse,
  ScenarioId,
  UnavailableQuote,
  UnavailableReason,
} from '../types';
import { rankQuotes } from '../quotes/ranking';
import { midMarketRate } from './market';
import { getMockProvider, type MockProviderProfile } from './providers';
import { mockRosterFor } from './roster';
import { createRng, type Rng } from './rng';
import { paymentMethodsFor } from '../corridorNotes';

/**
 * The adversarial mock engine.
 *
 * Instant, perfect mocks produce frontends with no real error handling, so
 * this one times out, refuses amounts, estimates when it cannot be sure, and
 * takes its time about all of it. Everything is driven by a seeded stream, so
 * any scenario reproduces from the URL.
 *
 * LIVE: replaced wholesale by the quote engine. Nothing outside
 * lib/quotes/source.ts imports this module.
 */

/** How long a quote stays valid. */
export const QUOTE_TTL_SECONDS = 90;

export interface PlannedOutcome {
  provider: string;
  /** When this provider's result arrives, in milliseconds from request start. */
  latencyMs: number;
  result: { kind: 'quote'; quote: Quote } | { kind: 'unavailable'; entry: UnavailableQuote };
}

export interface MockPlan {
  requestId: string;
  corridor: CorridorMeta;
  inputAmount: Money;
  generatedAt: string;
  expiresAt: string;
  outcomes: PlannedOutcome[];
}

export type PlanResult = { ok: true; plan: MockPlan } | { ok: false; error: QuoteError };

/* -------------------------------------------------------------------------- */

function defaultSeed(corridor: string, amount: string): string {
  // Bucketed by minute so a page left open re-quotes rather than freezing.
  return `${corridor}:${amount}:${Math.floor(Date.now() / 60_000)}`;
}

function validate(request: QuoteRequest): { corridor: CorridorMeta; amount: Money } | QuoteError {
  const corridor = getCorridor(request.corridor);
  if (!corridor) {
    const nearest = nearestCorridor(request.corridor);
    return {
      code: 'corridor_unsupported',
      message: `Netfall does not track ${request.corridor.toUpperCase().replace('-', ' to ')} yet.`,
      suggestion: nearest.slug,
    };
  }

  if (!isValidDecimalString(request.amount)) {
    return { code: 'amount_invalid', message: 'Enter an amount to compare.' };
  }

  if (lessThan(request.amount, corridor.minAmount)) {
    return {
      code: 'amount_below_minimum',
      message: `No provider in this corridor quotes below ${corridor.minAmount} ${corridor.from}.`,
    };
  }

  if (greaterThan(request.amount, corridor.maxAmount)) {
    return {
      code: 'amount_above_maximum',
      message: `Amounts above ${corridor.maxAmount} ${corridor.from} are handled as a large-amount enquiry.`,
    };
  }

  return { corridor, amount: request.amount };
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

interface PricingContext {
  corridor: CorridorMeta;
  amount: Money;
  fiatPerAsset: Money;
  /** Multiplies every spread. Scenario knob. */
  spreadScale: number;
  /** Added to every spread, in bps. Scenario knob. */
  spreadFloorBps: number;
  /** All providers land on the same amount. Scenario knob. */
  flatten: boolean;
}

const assetDecimals = 2;

/**
 * Builds the fee ledger and derives the landed amount from it, rather than the
 * other way round. The lines therefore always sum to the total, exactly — a
 * breakdown that does not reconcile is a bug we make structurally impossible.
 */
function priceQuote(provider: MockProviderProfile, ctx: PricingContext, rng: Rng): Quote {
  const { corridor, amount, fiatPerAsset } = ctx;

  const grossAtMid = round(divide(amount, fiatPerAsset, 18), assetDecimals);

  const [spreadLow, spreadHigh] = provider.spreadBpsRange;
  let spreadBps = ctx.flatten
    ? 120
    : Math.round(rng.between(spreadLow, spreadHigh) * ctx.spreadScale) + ctx.spreadFloorBps;

  // Tiered pricing: the headline rate applies above a threshold most people
  // never reach, and small tickets quietly pay more.
  const tierThreshold = divide(corridor.defaultAmount, '2', 8);
  if (!ctx.flatten && lessThan(amount, tierThreshold)) {
    spreadBps += rng.int(25, 110);
  }

  const spreadCost = round(multiply(grossAtMid, divide(String(spreadBps), '10000', 12)), assetDecimals);
  const percentFee = ctx.flatten
    ? '0'
    : round(multiply(grossAtMid, divide(String(provider.percentFeeBps), '10000', 12)), assetDecimals);
  const flatFee = ctx.flatten ? '0' : provider.flatAssetFee;

  const lines: FeeLine[] = [
    { label: 'Amount at mid-market rate', amount: grossAtMid, currency: corridor.to },
  ];
  if (compare(spreadCost, '0') !== 0) {
    lines.push({ label: 'Provider rate margin', amount: negate(spreadCost), currency: corridor.to });
  }
  if (compare(percentFee, '0') !== 0) {
    lines.push({ label: 'Transfer fee', amount: negate(percentFee), currency: corridor.to });
  }
  if (compare(flatFee, '0') !== 0) {
    lines.push({
      label: provider.flatFeeLabel || 'Fixed fee',
      amount: negate(flatFee),
      currency: corridor.to,
    });
  }

  const landedAmount = sum(lines.map((l) => l.amount));
  const effectiveRate = divide(landedAmount, amount, 12);

  const settlementEstimateSeconds = rng.int(
    provider.settlementSecondsRange[0],
    provider.settlementSecondsRange[1],
  );

  const successRate30d = Math.min(
    0.999,
    Math.max(0.5, provider.successRate30d + rng.between(-0.015, 0.008)),
  );

  const paymentMethods = intersectMethods(provider, corridor);

  return {
    provider: provider.slug,
    providerName: provider.name,
    source: provider.source,
    landedAmount,
    effectiveRate,
    feeBreakdown: lines,
    settlementEstimateSeconds,
    successRate30d: Number(successRate30d.toFixed(4)),
    paymentMethods,
    confidence: 'exact',
    hasCommercialRelationship: provider.hasCommercialRelationship,
    routeUrl: provider.routeUrlTemplate
      .replace('{corridor}', corridor.slug)
      .replace('{amount}', encodeURIComponent(amount)),
  };
}

function intersectMethods(provider: MockProviderProfile, corridor: CorridorMeta): string[] {
  const shared = paymentMethodsFor(corridor.slug).filter((m) =>
    provider.paymentMethods.some((p) => p.toLowerCase() === m.toLowerCase()),
  );
  if (shared.length > 0) return shared;
  // Mobile-money corridors: match the generic label to the local network.
  if (provider.paymentMethods.includes('Mobile money')) {
    const local = paymentMethodsFor(corridor.slug).find((m) =>
      /momo|m-pesa|cash|money/i.test(m),
    );
    if (local) return [local];
  }
  return [...provider.paymentMethods].slice(0, 2);
}

/* -------------------------------------------------------------------------- */
/* Planning                                                                    */
/* -------------------------------------------------------------------------- */

const SCENARIO_UNAVAILABLE: Partial<Record<ScenarioId, UnavailableReason>> = {
  'all-fail': 'provider_down',
  'all-timeout': 'timeout',
};

export function buildPlan(request: QuoteRequest): PlanResult {
  const validated = validate(request);
  if ('code' in validated) return { ok: false, error: validated };

  const { corridor, amount } = validated;
  const scenario: ScenarioId = request.scenario ?? 'default';
  const seed = request.seed ?? defaultSeed(corridor.slug, amount);
  const rootRng = createRng(seed);

  const fiatPerAsset = midMarketRate(corridor.slug);
  if (!fiatPerAsset) {
    return {
      ok: false,
      error: { code: 'corridor_unsupported', message: 'No reference rate for this corridor.' },
    };
  }

  const ctx: PricingContext = {
    corridor,
    amount,
    fiatPerAsset,
    spreadScale: scenario === 'extreme-dispersion' ? 4.5 : 1,
    spreadFloorBps: scenario === 'extreme-dispersion' ? 40 : 0,
    flatten: scenario === 'zero-dispersion',
  };

  const slugs = mockRosterFor(corridor.slug);
  const outcomes: PlannedOutcome[] = [];

  slugs.forEach((slug, index) => {
    const provider = getMockProvider(slug);
    if (!provider) return;
    const rng = rootRng.fork(slug);
    const latencyMs = rng.int(200, 1800);

    const forcedReason = SCENARIO_UNAVAILABLE[scenario];
    if (forcedReason) {
      outcomes.push({
        provider: slug,
        latencyMs,
        result: { kind: 'unavailable', entry: unavailable(provider, forcedReason) },
      });
      return;
    }

    if (scenario === 'single-provider' && index !== 0) {
      const reason: UnavailableReason = index % 2 === 0 ? 'provider_down' : 'timeout';
      outcomes.push({
        provider: slug,
        latencyMs,
        result: { kind: 'unavailable', entry: unavailable(provider, reason) },
      });
      return;
    }

    const providerMin = multiply(corridor.minAmount, String(provider.minMultiplier));
    const providerMax = multiply(corridor.maxAmount, String(provider.maxMultiplier));

    if (lessThan(amount, providerMin)) {
      outcomes.push({
        provider: slug,
        latencyMs,
        result: { kind: 'unavailable', entry: unavailable(provider, 'below_minimum') },
      });
      return;
    }

    if (greaterThan(amount, providerMax)) {
      outcomes.push({
        provider: slug,
        latencyMs,
        result: { kind: 'unavailable', entry: unavailable(provider, 'above_maximum') },
      });
      return;
    }

    if (scenario === 'default' && rng.chance(provider.failureRate)) {
      // Roughly one in ten requests to a given provider does not come back.
      const reason: UnavailableReason = rng.chance(0.75) ? 'timeout' : 'provider_down';
      outcomes.push({
        provider: slug,
        latencyMs: reason === 'timeout' ? 1800 : latencyMs,
        result: { kind: 'unavailable', entry: unavailable(provider, reason) },
      });
      return;
    }

    const quote = priceQuote(provider, ctx, rng);
    quote.confidence = rng.chance(provider.staleRate)
      ? 'insufficient_data'
      : rng.chance(provider.estimateRate)
        ? 'estimated'
        : 'exact';

    outcomes.push({ provider: slug, latencyMs, result: { kind: 'quote', quote } });
  });

  enforceConfidenceSpread(outcomes, rootRng.fork('confidence'));

  const now = Date.now();
  const expiryOffsetMs = scenario === 'expired' ? -30_000 : QUOTE_TTL_SECONDS * 1000;

  return {
    ok: true,
    plan: {
      requestId: makeRequestId(seed),
      corridor,
      inputAmount: amount,
      generatedAt: new Date(scenario === 'expired' ? now - 120_000 : now).toISOString(),
      expiresAt: new Date(now + expiryOffsetMs).toISOString(),
      outcomes,
    },
  };
}

function unavailable(provider: MockProviderProfile, reason: UnavailableReason): UnavailableQuote {
  return { provider: provider.slug, providerName: provider.name, reason };
}

/**
 * §8.1 requires every corridor to surface both a soft confidence and a hard
 * one, so degraded states are always reachable without hunting for a seed.
 */
function enforceConfidenceSpread(outcomes: PlannedOutcome[], rng: Rng): void {
  const quotes = outcomes
    .map((o) => o.result)
    .filter((r): r is { kind: 'quote'; quote: Quote } => r.kind === 'quote')
    .map((r) => r.quote);

  if (quotes.length === 0) return;

  let estimatedIndex = quotes.findIndex((q) => q.confidence === 'estimated');
  let staleIndex = quotes.findIndex((q) => q.confidence === 'insufficient_data');

  const pickIndexExcluding = (excluded: number): number => {
    const candidates = quotes.map((_, i) => i).filter((i) => i !== excluded);
    if (candidates.length === 0) return -1;
    return candidates[rng.int(0, candidates.length - 1)] as number;
  };

  if (estimatedIndex === -1) {
    const index = pickIndexExcluding(staleIndex);
    if (index !== -1) {
      (quotes[index] as Quote).confidence = 'estimated';
      estimatedIndex = index;
    }
  }

  if (staleIndex === -1) {
    const index = pickIndexExcluding(estimatedIndex);
    if (index !== -1) {
      (quotes[index] as Quote).confidence = 'insufficient_data';
    }
  }
}

function makeRequestId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  return `req_${(h >>> 0).toString(36).padStart(7, '0')}`;
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                    */
/* -------------------------------------------------------------------------- */

export function assembleResponse(
  plan: MockPlan,
  quotes: readonly Quote[],
  unavailableEntries: readonly UnavailableQuote[],
): QuoteResponse {
  const ranked = rankQuotes(quotes);
  return {
    requestId: plan.requestId,
    corridor: plan.corridor.id,
    inputAmount: plan.inputAmount,
    generatedAt: plan.generatedAt,
    expiresAt: plan.expiresAt,
    dispersionBps: dispersionBps(ranked.map((q) => q.landedAmount)),
    quotes: ranked,
    unavailable: [...unavailableEntries],
  };
}

/** Synchronous resolution of a whole plan. Used by tests and static pages. */
export function resolvePlan(plan: MockPlan): QuoteResponse {
  const quotes: Quote[] = [];
  const unavailableEntries: UnavailableQuote[] = [];
  for (const outcome of plan.outcomes) {
    if (outcome.result.kind === 'quote') quotes.push(outcome.result.quote);
    else unavailableEntries.push(outcome.result.entry);
  }
  return assembleResponse(plan, quotes, unavailableEntries);
}

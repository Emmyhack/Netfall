import { describe, expect, it } from 'vitest';
import { CORRIDORS } from '../corridors';
import { buildPlan, resolvePlan } from '../mock/engine';
import { rankQuotes } from './ranking';
import { compare, divide, greaterThan, multiply, reconcileBreakdown } from '../money';
import type { Quote, QuoteResponse, ScenarioId } from '../types';

const SEEDS = ['a', 'b', 'c', 'd', 'e', 'seed-6', 'seed-7', 'seed-8'];

function resolve(
  corridorSlug: string,
  amount: string,
  seed: string,
  scenario: ScenarioId = 'default',
): QuoteResponse {
  const planned = buildPlan({ corridor: corridorSlug, amount, seed, scenario });
  if (!planned.ok) throw new Error(`plan failed: ${planned.error.code}`);
  return resolvePlan(planned.plan);
}

describe('rule §4.1 — ranking is by landed amount and nothing else', () => {
  it('sorts descending by landed amount across every corridor and seed', () => {
    for (const corridor of CORRIDORS) {
      for (const seed of SEEDS) {
        const response = resolve(corridor.slug, corridor.defaultAmount, seed);
        for (let i = 1; i < response.quotes.length; i += 1) {
          const previous = response.quotes[i - 1] as Quote;
          const current = response.quotes[i] as Quote;
          expect(compare(previous.landedAmount, current.landedAmount)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('does not lift a commercial partner above a better rate', () => {
    const base: Omit<Quote, 'provider' | 'providerName' | 'landedAmount' | 'hasCommercialRelationship'> = {
      source: 'direct',
      effectiveRate: '1',
      feeBreakdown: [],
      settlementEstimateSeconds: 60,
      successRate30d: 0.99,
      paymentMethods: [],
      confidence: 'exact',
      routeUrl: '',
    };
    const ranked = rankQuotes([
      { ...base, provider: 'partner', providerName: 'Partner', landedAmount: '100', hasCommercialRelationship: true },
      { ...base, provider: 'rival', providerName: 'Rival', landedAmount: '101', hasCommercialRelationship: false },
    ]);
    expect(ranked.map((q) => q.provider)).toEqual(['rival', 'partner']);
  });

  it('does not lift an exact quote above a better estimated one', () => {
    const base: Omit<Quote, 'provider' | 'providerName' | 'landedAmount' | 'confidence'> = {
      source: 'direct',
      effectiveRate: '1',
      feeBreakdown: [],
      settlementEstimateSeconds: 60,
      successRate30d: 0.99,
      paymentMethods: [],
      hasCommercialRelationship: false,
      routeUrl: '',
    };
    const ranked = rankQuotes([
      { ...base, provider: 'exact', providerName: 'Exact', landedAmount: '100', confidence: 'exact' },
      { ...base, provider: 'rough', providerName: 'Rough', landedAmount: '105', confidence: 'estimated' },
    ]);
    expect(ranked.map((q) => q.provider)).toEqual(['rough', 'exact']);
  });
});

describe('rule §4.2 — confidence is always present and always spread', () => {
  it('marks every quote with one of the three levels', () => {
    for (const corridor of CORRIDORS) {
      const response = resolve(corridor.slug, corridor.defaultAmount, 'confidence-seed');
      for (const quote of response.quotes) {
        expect(['exact', 'estimated', 'insufficient_data']).toContain(quote.confidence);
      }
    }
  });

  it('surfaces an estimate and an unverifiable quote in every corridor', () => {
    for (const corridor of CORRIDORS) {
      for (const seed of SEEDS) {
        const response = resolve(corridor.slug, corridor.defaultAmount, seed);
        if (response.quotes.length < 2) continue;
        const levels = new Set(response.quotes.map((q) => q.confidence));
        expect(levels.has('estimated')).toBe(true);
        expect(levels.has('insufficient_data')).toBe(true);
      }
    }
  });
});

describe('rule §4.3 — unavailable providers are reported, never dropped', () => {
  it('accounts for every provider in the corridor', () => {
    for (const corridor of CORRIDORS) {
      const response = resolve(corridor.slug, corridor.defaultAmount, 'coverage');
      const seen = new Set([
        ...response.quotes.map((q) => q.provider),
        ...response.unavailable.map((u) => u.provider),
      ]);
      expect(seen.size).toBe(corridor.providers.length);
      for (const slug of corridor.providers) expect(seen.has(slug)).toBe(true);
    }
  });

  it('reports a floor for small amounts and a ceiling for large ones', () => {
    for (const corridor of CORRIDORS) {
      const small = resolve(corridor.slug, corridor.minAmount, 'limits');
      expect(small.unavailable.some((u) => u.reason === 'below_minimum')).toBe(true);

      const large = divide(corridor.otcThreshold, '1.2', 2);
      const big = resolve(corridor.slug, large, 'limits');
      expect(big.unavailable.some((u) => u.reason === 'above_maximum')).toBe(true);
    }
  });
});

describe('fee breakdowns reconcile exactly', () => {
  it('sums every ledger back to its landed amount', () => {
    for (const corridor of CORRIDORS) {
      for (const seed of SEEDS) {
        const response = resolve(corridor.slug, corridor.defaultAmount, seed);
        for (const quote of response.quotes) {
          expect(reconcileBreakdown(quote.feeBreakdown, quote.landedAmount)).toEqual({ ok: true });
        }
      }
    }
  });

  it('denominates every line in the destination asset', () => {
    const response = resolve('ngn-usdt', '500000', 'ledger');
    for (const quote of response.quotes) {
      for (const line of quote.feeBreakdown) expect(line.currency).toBe('USDT');
    }
  });

  it('opens with the mid-market reference and deducts from there', () => {
    const response = resolve('ngn-usdt', '500000', 'ledger');
    for (const quote of response.quotes) {
      const [first, ...rest] = quote.feeBreakdown;
      expect(first?.label).toBe('Amount at mid-market rate');
      expect(greaterThan(first?.amount ?? '0', '0')).toBe(true);
      for (const line of rest) expect(compare(line.amount, '0')).toBe(-1);
    }
  });
});

describe('effective rate matches the landed amount', () => {
  it('is landed divided by input, to twelve places', () => {
    const response = resolve('kes-usdt', '50000', 'rate');
    for (const quote of response.quotes) {
      expect(quote.effectiveRate).toBe(divide(quote.landedAmount, response.inputAmount, 12));
      // And it round-trips back to the landed amount within a cent.
      const roundTrip = multiply(quote.effectiveRate, response.inputAmount);
      expect(Math.abs(Number(roundTrip) - Number(quote.landedAmount))).toBeLessThan(0.01);
    }
  });
});

describe('mock behaviour §8.1', () => {
  it('spreads provider latency across 200ms to 1800ms', () => {
    const planned = buildPlan({ corridor: 'ngn-usdt', amount: '500000', seed: 'latency' });
    if (!planned.ok) throw new Error('plan failed');
    for (const outcome of planned.plan.outcomes) {
      expect(outcome.latencyMs).toBeGreaterThanOrEqual(200);
      expect(outcome.latencyMs).toBeLessThanOrEqual(1800);
    }
  });

  it('fails roughly one provider call in ten', () => {
    let calls = 0;
    let failures = 0;
    for (let i = 0; i < 400; i += 1) {
      const response = resolve('ngn-usdt', '500000', `fail-${i}`);
      calls += response.quotes.length + response.unavailable.length;
      failures += response.unavailable.filter(
        (u) => u.reason === 'timeout' || u.reason === 'provider_down',
      ).length;
    }
    const rate = failures / calls;
    expect(rate).toBeGreaterThan(0.03);
    expect(rate).toBeLessThan(0.2);
  });

  it('is reproducible from a seed', () => {
    const a = resolve('ghs-usdt', '5000', 'repeatable');
    const b = resolve('ghs-usdt', '5000', 'repeatable');

    // The seed governs pricing, not the clock. generatedAt and expiresAt come
    // from Date.now(), so two consecutive calls that straddle a millisecond
    // legitimately differ; comparing whole responses made this test flaky.
    const { generatedAt: _ga, expiresAt: _ea, ...seeded } = a;
    const { generatedAt: _gb, expiresAt: _eb, ...other } = b;
    expect(other).toEqual(seeded);
  });

  it('stamps every response with a validity window', () => {
    const response = resolve('ghs-usdt', '5000', 'repeatable');
    const generated = new Date(response.generatedAt).getTime();
    const expires = new Date(response.expiresAt).getTime();

    expect(Number.isNaN(generated)).toBe(false);
    expect(Number.isNaN(expires)).toBe(false);
    expect(expires).toBeGreaterThan(generated);
  });

  it('changes with the seed', () => {
    const a = resolve('ghs-usdt', '5000', 'one');
    const b = resolve('ghs-usdt', '5000', 'two');
    expect(b.quotes.map((q) => q.landedAmount)).not.toEqual(a.quotes.map((q) => q.landedAmount));
  });
});

describe('scenarios', () => {
  it('all-fail leaves no quotes and explains every absence', () => {
    const response = resolve('ngn-usdt', '500000', 's', 'all-fail');
    expect(response.quotes).toHaveLength(0);
    expect(response.unavailable.length).toBeGreaterThan(0);
    expect(response.unavailable.every((u) => u.reason === 'provider_down')).toBe(true);
  });

  it('all-timeout attributes every absence to a timeout', () => {
    const response = resolve('ngn-usdt', '500000', 's', 'all-timeout');
    expect(response.quotes).toHaveLength(0);
    expect(response.unavailable.every((u) => u.reason === 'timeout')).toBe(true);
  });

  it('single-provider leaves exactly one quote', () => {
    const response = resolve('ngn-usdt', '500000', 's', 'single-provider');
    expect(response.quotes).toHaveLength(1);
  });

  it('zero-dispersion lands every provider on the same amount', () => {
    const response = resolve('ngn-usdt', '500000', 's', 'zero-dispersion');
    expect(response.dispersionBps).toBe(0);
    const amounts = new Set(response.quotes.map((q) => q.landedAmount));
    expect(amounts.size).toBe(1);
  });

  it('extreme-dispersion blows the spread out', () => {
    const response = resolve('ngn-usdt', '500000', 's', 'extreme-dispersion');
    expect(response.dispersionBps).toBeGreaterThan(400);
  });

  it('expired hands back a quote that is already stale', () => {
    const response = resolve('ngn-usdt', '500000', 's', 'expired');
    expect(new Date(response.expiresAt).getTime()).toBeLessThan(Date.now());
  });
});

describe('request validation', () => {
  it('rejects an unsupported corridor and suggests the nearest one', () => {
    const planned = buildPlan({ corridor: 'zar-usdt', amount: '1000' });
    expect(planned.ok).toBe(false);
    if (planned.ok) return;
    expect(planned.error.code).toBe('corridor_unsupported');
    expect(planned.error.suggestion).toBeDefined();
  });

  it('rejects an amount that is not a decimal string', () => {
    const planned = buildPlan({ corridor: 'ngn-usdt', amount: '1e6' });
    expect(planned.ok).toBe(false);
    if (planned.ok) return;
    expect(planned.error.code).toBe('amount_invalid');
  });

  it('rejects amounts outside the corridor', () => {
    const below = buildPlan({ corridor: 'ngn-usdt', amount: '10' });
    expect(below.ok).toBe(false);
    if (!below.ok) expect(below.error.code).toBe('amount_below_minimum');

    const above = buildPlan({ corridor: 'ngn-usdt', amount: '9000000000' });
    expect(above.ok).toBe(false);
    if (!above.ok) expect(above.error.code).toBe('amount_above_maximum');
  });
});

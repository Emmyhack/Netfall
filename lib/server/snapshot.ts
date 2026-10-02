import { CORRIDORS } from '../corridors';
import { aggregate } from '../live/aggregate';
import { divide, round } from '../money';
import type { QuoteResponse } from '../types';

/**
 * One corridor's best usable price at its default amount, as measured by a
 * scheduled tick. "Usable" excludes insufficient_data quotes: an alert must
 * never fire on a figure we ourselves would not stand behind.
 */
export interface CorridorSnapshot {
  corridor: string;
  at: string;
  amount: string;
  provider: string;
  providerName: string;
  landed: string;
  /** Fiat per one unit of the asset at the best usable quote. */
  fiatPerAsset: string;
}

export interface TickMeasurement {
  snapshots: Map<string, CorridorSnapshot>;
  responses: Map<string, QuoteResponse>;
}

export async function measureCorridors(): Promise<TickMeasurement> {
  const results = await Promise.all(
    CORRIDORS.map(async (c) => ({ c, response: await aggregate(c.slug, c.defaultAmount).catch(() => null) })),
  );
  const snapshots = new Map<string, CorridorSnapshot>();
  const responses = new Map<string, QuoteResponse>();
  for (const { c, response } of results) {
    if (!response) continue;
    responses.set(c.slug, response);
    const best = response.quotes.find((q) => q.confidence !== 'insufficient_data');
    if (!best) continue;
    snapshots.set(c.slug, {
      corridor: c.slug,
      at: response.generatedAt,
      amount: c.defaultAmount,
      provider: best.provider,
      providerName: best.providerName,
      landed: best.landedAmount,
      fiatPerAsset: round(divide(c.defaultAmount, best.landedAmount, 8), 4),
    });
  }
  return { snapshots, responses };
}

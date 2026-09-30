import { formatBps, formatMoney, formatSettlement } from './format';
import { sampleCorridor } from './quotes/server';
import { providersFor } from './live/registry-core';
import { liveProvidersFor } from './live/registry';
import type { CorridorMeta } from './types';

export interface CorridorInsight {
  measuredDispersionBps: number;
  quotingCount: number;
  unavailableCount: number;
  providerNames: string[];
  aggregatorNames: string[];
  fastestSettlement: string | null;
  sampleAmount: string;
  bestLanded: string | null;
  worstLanded: string | null;
}

/**
 * Corridor pages are the search acquisition asset, so each needs copy about
 * that corridor specifically. The structure is generated from the data layer;
 * real editorial copy replaces the prose later.
 *
 * Seeded so a statically generated page says the same thing on every build.
 */
export async function corridorInsight(corridor: CorridorMeta): Promise<CorridorInsight> {
  const response = await sampleCorridor(corridor.slug, corridor.defaultAmount, `page:${corridor.slug}`);

  const inCorridor = liveProvidersFor(corridor.slug);

  const providerNames = inCorridor.map((p) => p.name);
  const aggregatorNames = inCorridor.filter((p) => p.source === 'aggregator').map((p) => p.name);

  if (!response) {
    return {
      // 0 here means "not measured", never a claim of a tight market; the
      // copy that renders this value says so in words.
      measuredDispersionBps: 0,
      quotingCount: 0,
      unavailableCount: 0,
      providerNames,
      aggregatorNames,
      fastestSettlement: null,
      sampleAmount: corridor.defaultAmount,
      bestLanded: null,
      worstLanded: null,
    };
  }

  const fastest = response.quotes.reduce<number | null>((best, q) => {
    if (q.settlementEstimateSeconds === undefined) return best;
    return best === null || q.settlementEstimateSeconds < best
      ? q.settlementEstimateSeconds
      : best;
  }, null);

  return {
    measuredDispersionBps: response.dispersionBps,
    quotingCount: response.quotes.length,
    unavailableCount: response.unavailable.length,
    providerNames,
    aggregatorNames,
    fastestSettlement: fastest === null ? null : formatSettlement(fastest),
    sampleAmount: corridor.defaultAmount,
    bestLanded: response.quotes[0]?.landedAmount ?? null,
    worstLanded: response.quotes[response.quotes.length - 1]?.landedAmount ?? null,
  };
}

/** One-sentence summary used in metadata descriptions and social cards. */
export function corridorSummary(corridor: CorridorMeta, insight: CorridorInsight): string {
  const base =
    `Compare ${providersFor(corridor.slug).length} providers converting ${corridor.fromName} to ` +
    `${corridor.toName}, ranked by how much actually lands.`;
  if (insight.measuredDispersionBps <= 0) return base;
  return (
    `${base} Measured spread between best and worst: ` +
    `${formatBps(insight.measuredDispersionBps)} on ` +
    `${formatMoney(insight.sampleAmount, corridor.from, { decimals: 0 })}.`
  );
}

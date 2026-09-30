import { CORRIDORS } from './corridors';
import { sampleCorridor } from './quotes/server';
import { providersFor } from './live/registry-core';

export interface Coverage {
  corridorCount: number;
  providerCount: number;
  medianDispersionBps: number;
  widestCorridor: { slug: string; from: string; to: string; dispersionBps: number } | null;
}

/**
 * Coverage figures are measured, not written into the markup. If a corridor is
 * added or a provider drops out, these move on their own.
 *
 * LIVE: the engine exposes the same three numbers over /v1/coverage, computed
 * across the last hour of real quotes rather than one seeded sample.
 */
export async function computeCoverage(seed = 'coverage'): Promise<Coverage> {
  const providers = new Set<string>();
  for (const corridor of CORRIDORS) {
    for (const provider of providersFor(corridor.slug)) providers.add(provider.slug);
  }

  // Corridors sample in parallel: sequential awaits meant every corridor
  // paid the full timeout of every unreachable venue, one after another,
  // and a page prerender drowned in the accumulated waiting.
  const sampled = await Promise.all(
    CORRIDORS.map(async (corridor) => ({
      corridor,
      response: await sampleCorridor(corridor.slug, corridor.defaultAmount, seed),
    })),
  );

  const measurements = sampled
    .filter(({ response }) => response !== null && response.quotes.length >= 2)
    .map(({ corridor, response }) => ({
      slug: corridor.slug,
      from: corridor.from,
      to: corridor.to,
      dispersionBps: (response as NonNullable<typeof response>).dispersionBps,
    }));

  const sorted = measurements.map((m) => m.dispersionBps).sort((a, b) => a - b);
  const widest = measurements.reduce<(typeof measurements)[number] | null>(
    (worst, m) => (worst === null || m.dispersionBps > worst.dispersionBps ? m : worst),
    null,
  );

  return {
    corridorCount: CORRIDORS.length,
    providerCount: providers.size,
    medianDispersionBps: median(sorted),
    widestCorridor: widest,
  };
}

function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] as number;
  return Math.round(((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2);
}

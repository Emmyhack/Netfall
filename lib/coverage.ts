import { CORRIDORS } from './corridors';
import { sampleCorridor } from './quotes/source';

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
  const measurements: { slug: string; from: string; to: string; dispersionBps: number }[] = [];

  for (const corridor of CORRIDORS) {
    for (const provider of corridor.providers) providers.add(provider);
    const response = await sampleCorridor(corridor.slug, corridor.defaultAmount, seed);
    if (!response || response.quotes.length < 2) continue;
    measurements.push({
      slug: corridor.slug,
      from: corridor.from,
      to: corridor.to,
      dispersionBps: response.dispersionBps,
    });
  }

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

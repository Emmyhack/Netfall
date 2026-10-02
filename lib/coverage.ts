import { CORRIDORS } from './corridors';
import { sampleCorridor } from './quotes/server';
import { providersFor } from './live/registry-core';

export interface Coverage {
  corridorCount: number;
  providerCount: number;
  /** Providers that returned a live price in at least one corridor when sampled. */
  liveProviderCount: number;
  /**
   * Median best-to-worst spread across corridors where at least two
   * providers answered. Null when no corridor had two: a spread over one
   * price is not zero, it is unmeasurable, and must not be shown as 0.
   */
  medianDispersionBps: number | null;
  widestCorridor: { slug: string; from: string; to: string; dispersionBps: number } | null;
}

/**
 * Coverage figures are measured, not written into the markup. If a corridor is
 * added or a provider drops out, these move on their own.
 *
 * One live sample per corridor at its default amount, taken when the
 * calling page regenerates.
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

  const live = new Set<string>();
  for (const { response } of sampled) {
    for (const quote of response?.quotes ?? []) live.add(quote.provider);
  }

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
    liveProviderCount: live.size,
    medianDispersionBps: sorted.length > 0 ? median(sorted) : null,
    widestCorridor: widest,
  };
}

function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] as number;
  return Math.round(((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2);
}

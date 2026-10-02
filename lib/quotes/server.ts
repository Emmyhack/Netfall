import { aggregate } from '../live/aggregate';
import { LIVE_PROVIDERS } from '../live/registry';
import type { ProviderProfile, QuoteResponse } from '../types';
import { isLive } from '../live/configured';

/**
 * The server half of the data seam. The client half (source.ts) is bundled
 * into the browser and may only reach the live layer over HTTP; this module
 * imports it directly and must therefore never be imported from client code
 * — the node: imports inside the connectors make webpack enforce exactly
 * that, loudly, at build time.
 */
export async function sampleCorridor(
  corridorSlug: string,
  amount: string,
  _seed?: string,
): Promise<QuoteResponse | null> {
  return aggregate(corridorSlug, amount);
}

/** The provider directory, straight from the live registry. */
export async function listProviders(): Promise<ProviderProfile[]> {
  return LIVE_PROVIDERS.map((p) => ({
    slug: p.slug,
    name: p.name,
    source: p.source,
    hasCommercialRelationship: p.hasCommercialRelationship,
    routeUrlTemplate: p.routeUrlTemplate,
    integrated: isLive(p.slug),
  }));
}

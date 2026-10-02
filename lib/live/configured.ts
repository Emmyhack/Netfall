import { yellowCardConfigured } from './connectors/yellowcard';
import { CORE_PROVIDERS } from './registry-core';

/**
 * Whether a provider can actually produce a price on this deployment: it
 * has a connector, and any credentials that connector needs are present.
 * Server-rendered claims ("N with live pricing", the provider wall's live
 * marker) use this, so a connector waiting on keys is never advertised.
 */
export function isLive(slug: string): boolean {
  const core = CORE_PROVIDERS.find((p) => p.slug === slug);
  if (!core?.integrated) return false;
  if (slug === 'yellowcard') return yellowCardConfigured();
  return true;
}

import type { ProviderProfile, QuoteSource } from '../types';
import { CORE_PROVIDERS, type CoreProvider } from './registry-core';

export { providersFor, integratedFor } from './registry-core';
export type { CoreProvider } from './registry-core';

/**
 * The server half of the provider registry. Every entry is a real company,
 * so every field is either verifiable or absent:
 *
 *   - hasCommercialRelationship is false across the board, because none
 *     exists. The disclosure pages say the same. When a referral agreement
 *     is signed, the flag flips and the labelling machinery already works.
 *   - routeUrlTemplate is the provider's own site, with no invented referral
 *     parameters.
 *   - integrated (in the client core) means a live pricing connector exists
 *     under lib/live/connectors. Everyone else appears in results as
 *     not_configured — the truthful state of an integration we have not
 *     built or been granted credentials for.
 */

interface ProviderDetail {
  source: QuoteSource;
  hasCommercialRelationship: boolean;
  routeUrlTemplate: string;
}

const DETAIL: Readonly<Record<string, ProviderDetail>> = {
  quidax: {
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: 'https://www.quidax.io/',
  },
  'binance-p2p': {
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: 'https://p2p.binance.com/',
  },
  luno: {
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: 'https://www.luno.com/',
  },
  yellowcard: {
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: 'https://yellowcard.io/',
  },
  busha: {
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: 'https://www.busha.co/',
  },
  bitnob: {
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: 'https://bitnob.com/',
  },
  transak: {
    source: 'aggregator',
    hasCommercialRelationship: false,
    routeUrlTemplate: 'https://global.transak.com/',
  },
  moonpay: {
    source: 'aggregator',
    hasCommercialRelationship: false,
    routeUrlTemplate: 'https://www.moonpay.com/',
  },
};

export interface LiveProvider extends CoreProvider, ProviderProfile {
  integrated: boolean;
}

export const LIVE_PROVIDERS: readonly LiveProvider[] = CORE_PROVIDERS.map((core) => {
  const detail = DETAIL[core.slug];
  if (!detail) throw new Error(`registry: no server detail for ${core.slug}`);
  return { ...core, ...detail };
});

export function liveProvider(slug: string): LiveProvider | null {
  return LIVE_PROVIDERS.find((p) => p.slug === slug) ?? null;
}

export function liveProvidersFor(corridorSlug: string): readonly LiveProvider[] {
  return LIVE_PROVIDERS.filter((p) =>
    (p.corridors as readonly string[]).includes(corridorSlug.toLowerCase()),
  );
}

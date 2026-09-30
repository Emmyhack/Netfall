import type { AssetCode, CorridorMeta, CorridorSlug, FiatCode } from './types';

/**
 * V1 corridors: copy and limits. Which providers serve a corridor is the
 * provider registry's business (lib/live/registry-core.ts), not this file's.
 */

export const FIAT_NAMES: Readonly<Record<FiatCode, string>> = {
  NGN: 'Nigerian naira',
  GHS: 'Ghanaian cedi',
  KES: 'Kenyan shilling',
};

export const ASSET_NAMES: Readonly<Record<AssetCode, string>> = {
  USDT: 'Tether USD',
  USDC: 'USD Coin',
};

export const FIAT_CODES: readonly FiatCode[] = ['NGN', 'GHS', 'KES'];
export const ASSET_CODES: readonly AssetCode[] = ['USDT', 'USDC'];

export const CORRIDORS: readonly CorridorMeta[] = [
  {
    slug: 'ngn-usdt',
    id: 'NGN-USDT',
    from: 'NGN',
    to: 'USDT',
    fromName: FIAT_NAMES.NGN,
    toName: ASSET_NAMES.USDT,
    defaultAmount: '500000',
    minAmount: '5000',
    maxAmount: '500000000',
    otcThreshold: '50000000',
  },
  {
    slug: 'ngn-usdc',
    id: 'NGN-USDC',
    from: 'NGN',
    to: 'USDC',
    fromName: FIAT_NAMES.NGN,
    toName: ASSET_NAMES.USDC,
    defaultAmount: '500000',
    minAmount: '5000',
    maxAmount: '300000000',
    otcThreshold: '40000000',
  },
  {
    slug: 'ghs-usdt',
    id: 'GHS-USDT',
    from: 'GHS',
    to: 'USDT',
    fromName: FIAT_NAMES.GHS,
    toName: ASSET_NAMES.USDT,
    defaultAmount: '5000',
    minAmount: '50',
    maxAmount: '5000000',
    otcThreshold: '500000',
  },
  {
    slug: 'ghs-usdc',
    id: 'GHS-USDC',
    from: 'GHS',
    to: 'USDC',
    fromName: FIAT_NAMES.GHS,
    toName: ASSET_NAMES.USDC,
    defaultAmount: '5000',
    minAmount: '50',
    maxAmount: '3000000',
    otcThreshold: '400000',
  },
  {
    slug: 'kes-usdt',
    id: 'KES-USDT',
    from: 'KES',
    to: 'USDT',
    fromName: FIAT_NAMES.KES,
    toName: ASSET_NAMES.USDT,
    defaultAmount: '50000',
    minAmount: '500',
    maxAmount: '50000000',
    otcThreshold: '4000000',
  },
  {
    slug: 'kes-usdc',
    id: 'KES-USDC',
    from: 'KES',
    to: 'USDC',
    fromName: FIAT_NAMES.KES,
    toName: ASSET_NAMES.USDC,
    defaultAmount: '50000',
    minAmount: '500',
    maxAmount: '30000000',
    otcThreshold: '3500000',
  },
];

const BY_SLUG = new Map<string, CorridorMeta>(CORRIDORS.map((c) => [c.slug, c]));

export function getCorridor(slug: string | undefined | null): CorridorMeta | null {
  if (!slug) return null;
  return BY_SLUG.get(slug.toLowerCase()) ?? null;
}

export function corridorSlug(from: FiatCode, to: AssetCode): CorridorSlug {
  return `${from.toLowerCase()}-${to.toLowerCase()}`;
}

export function isSupportedCorridor(slug: string): boolean {
  return BY_SLUG.has(slug.toLowerCase());
}

export function parseCorridorSlug(slug: string): { from: string; to: string } | null {
  const parts = slug.toLowerCase().split('-');
  if (parts.length !== 2) return null;
  const [from, to] = parts;
  if (!from || !to) return null;
  return { from, to };
}

/**
 * Closest supported corridor to an unsupported slug: same source currency if
 * we have one, otherwise the same asset, otherwise the busiest corridor.
 */
export function nearestCorridor(slug: string): CorridorMeta {
  const parsed = parseCorridorSlug(slug);
  const fallback = CORRIDORS[0] as CorridorMeta;
  if (!parsed) return fallback;
  const sameFrom = CORRIDORS.find((c) => c.from.toLowerCase() === parsed.from);
  if (sameFrom) return sameFrom;
  const sameTo = CORRIDORS.find((c) => c.to.toLowerCase() === parsed.to);
  if (sameTo) return sameTo;
  return fallback;
}

export function corridorsFrom(from: FiatCode): readonly CorridorMeta[] {
  return CORRIDORS.filter((c) => c.from === from);
}

export function assetsFor(from: FiatCode): readonly AssetCode[] {
  return CORRIDORS.filter((c) => c.from === from).map((c) => c.to);
}

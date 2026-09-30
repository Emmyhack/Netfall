import type { AssetCode, FiatCode } from '../types';

/**
 * The client-safe half of the provider registry: exactly what the browser
 * fan-out needs to know — who exists, which corridors they serve, and
 * whether a live integration answers for them. Names are display strings.
 *
 * Everything else about a provider (site URL, direct/aggregator sourcing,
 * commercial flags) lives in registry.ts on the server; shipping it here
 * cost real bytes in every first load for data the client never reads.
 */

export type CorridorKey = `${Lowercase<FiatCode>}-${Lowercase<AssetCode>}`;

export interface CoreProvider {
  slug: string;
  name: string;
  integrated: boolean;
  corridors: readonly CorridorKey[];
}

export const CORE_PROVIDERS: readonly CoreProvider[] = [
  {
    slug: 'quidax',
    name: 'Quidax',
    integrated: true,
    corridors: ['ngn-usdt', 'ngn-usdc', 'ghs-usdt', 'ghs-usdc'],
  },
  {
    slug: 'binance-p2p',
    name: 'Binance P2P',
    integrated: true,
    corridors: ['ngn-usdt', 'ngn-usdc', 'ghs-usdt', 'ghs-usdc', 'kes-usdt', 'kes-usdc'],
  },
  {
    slug: 'luno',
    name: 'Luno',
    integrated: true,
    corridors: ['ngn-usdt', 'ngn-usdc', 'kes-usdt', 'kes-usdc'],
  },
  {
    slug: 'yellowcard',
    name: 'Yellow Card',
    integrated: false,
    corridors: ['ngn-usdt', 'ngn-usdc', 'ghs-usdt', 'ghs-usdc', 'kes-usdt', 'kes-usdc'],
  },
  { slug: 'busha', name: 'Busha', integrated: false, corridors: ['ngn-usdt', 'ngn-usdc'] },
  {
    slug: 'bitnob',
    name: 'Bitnob',
    integrated: false,
    corridors: ['ngn-usdt', 'ghs-usdt', 'kes-usdt'],
  },
  {
    slug: 'transak',
    name: 'Transak',
    integrated: false,
    corridors: ['ngn-usdt', 'ngn-usdc', 'ghs-usdt', 'ghs-usdc', 'kes-usdt', 'kes-usdc'],
  },
  {
    slug: 'moonpay',
    name: 'MoonPay',
    integrated: false,
    corridors: ['ngn-usdt', 'ngn-usdc', 'kes-usdt', 'kes-usdc'],
  },
];

export function providersFor(corridorSlug: string): readonly CoreProvider[] {
  return CORE_PROVIDERS.filter((p) =>
    (p.corridors as readonly string[]).includes(corridorSlug.toLowerCase()),
  );
}

export function integratedFor(corridorSlug: string): readonly CoreProvider[] {
  return providersFor(corridorSlug).filter((p) => p.integrated);
}

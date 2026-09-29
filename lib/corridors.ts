import type { AssetCode, CorridorMeta, CorridorSlug, FiatCode } from './types';

/**
 * V1 corridors. Everything that varies per corridor — copy, limits, provider
 * coverage — is declared here so pages and mocks read from one source.
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

const NGN_PROVIDERS_USDT = [
  'yellowcard',
  'busha',
  'quidax',
  'roqqu',
  'binance-p2p',
  'bitnob',
  'accrue',
  'juicyway',
  'transak',
  'moonpay',
];

const NGN_PROVIDERS_USDC = [
  'yellowcard',
  'busha',
  'quidax',
  'binance-p2p',
  'bitnob',
  'accrue',
  'transak',
  'moonpay',
];

const GHS_PROVIDERS = ['yellowcard', 'bitnob', 'fonbnk', 'binance-p2p', 'accrue', 'transak', 'moonpay'];
const GHS_PROVIDERS_USDC = ['yellowcard', 'bitnob', 'fonbnk', 'binance-p2p', 'transak', 'moonpay'];

const KES_PROVIDERS = ['yellowcard', 'bitnob', 'binance-p2p', 'fonbnk', 'luno', 'transak', 'moonpay'];
const KES_PROVIDERS_USDC = ['yellowcard', 'bitnob', 'binance-p2p', 'fonbnk', 'luno', 'transak', 'moonpay'];

export const CORRIDORS: readonly CorridorMeta[] = [
  {
    slug: 'ngn-usdt',
    id: 'NGN-USDT',
    from: 'NGN',
    to: 'USDT',
    fromName: FIAT_NAMES.NGN,
    toName: ASSET_NAMES.USDT,
    countryName: 'Nigeria',
    defaultAmount: '500000',
    minAmount: '5000',
    maxAmount: '500000000',
    otcThreshold: '50000000',
    typicalDispersionBps: 310,
    commonPaymentMethods: ['Bank transfer', 'Card', 'USSD', 'Opay', 'PalmPay'],
    providers: NGN_PROVIDERS_USDT,
  },
  {
    slug: 'ngn-usdc',
    id: 'NGN-USDC',
    from: 'NGN',
    to: 'USDC',
    fromName: FIAT_NAMES.NGN,
    toName: ASSET_NAMES.USDC,
    countryName: 'Nigeria',
    defaultAmount: '500000',
    minAmount: '5000',
    maxAmount: '300000000',
    otcThreshold: '40000000',
    typicalDispersionBps: 275,
    commonPaymentMethods: ['Bank transfer', 'Card', 'USSD'],
    providers: NGN_PROVIDERS_USDC,
  },
  {
    slug: 'ghs-usdt',
    id: 'GHS-USDT',
    from: 'GHS',
    to: 'USDT',
    fromName: FIAT_NAMES.GHS,
    toName: ASSET_NAMES.USDT,
    countryName: 'Ghana',
    defaultAmount: '5000',
    minAmount: '50',
    maxAmount: '5000000',
    otcThreshold: '500000',
    typicalDispersionBps: 385,
    commonPaymentMethods: ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money', 'Bank transfer'],
    providers: GHS_PROVIDERS,
  },
  {
    slug: 'ghs-usdc',
    id: 'GHS-USDC',
    from: 'GHS',
    to: 'USDC',
    fromName: FIAT_NAMES.GHS,
    toName: ASSET_NAMES.USDC,
    countryName: 'Ghana',
    defaultAmount: '5000',
    minAmount: '50',
    maxAmount: '3000000',
    otcThreshold: '400000',
    typicalDispersionBps: 340,
    commonPaymentMethods: ['MTN MoMo', 'Telecel Cash', 'Bank transfer'],
    providers: GHS_PROVIDERS_USDC,
  },
  {
    slug: 'kes-usdt',
    id: 'KES-USDT',
    from: 'KES',
    to: 'USDT',
    fromName: FIAT_NAMES.KES,
    toName: ASSET_NAMES.USDT,
    countryName: 'Kenya',
    defaultAmount: '50000',
    minAmount: '500',
    maxAmount: '50000000',
    otcThreshold: '4000000',
    typicalDispersionBps: 265,
    commonPaymentMethods: ['M-Pesa', 'Bank transfer', 'Airtel Money'],
    providers: KES_PROVIDERS,
  },
  {
    slug: 'kes-usdc',
    id: 'KES-USDC',
    from: 'KES',
    to: 'USDC',
    fromName: FIAT_NAMES.KES,
    toName: ASSET_NAMES.USDC,
    countryName: 'Kenya',
    defaultAmount: '50000',
    minAmount: '500',
    maxAmount: '30000000',
    otcThreshold: '3500000',
    typicalDispersionBps: 290,
    commonPaymentMethods: ['M-Pesa', 'Bank transfer'],
    providers: KES_PROVIDERS_USDC,
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

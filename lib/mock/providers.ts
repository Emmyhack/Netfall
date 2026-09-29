import type { ProviderProfile, QuoteSource } from '../types';

/**
 * Mock provider registry.
 *
 * LIVE: the real engine loads this from the provider configuration service.
 * Only the ProviderProfile fields are part of the API contract; the pricing
 * character below exists purely to make the mocks behave like a real market —
 * some providers hide cost in the spread, some in a headline fee, some are
 * simply unreliable.
 */

export interface MockProviderProfile extends ProviderProfile {
  /** Rate markup against mid-market, in basis points. */
  spreadBpsRange: readonly [number, number];
  /** Percentage fee on the converted amount, in basis points. */
  percentFeeBps: number;
  /** Flat fee charged in the destination asset. */
  flatAssetFee: string;
  /** Plain-language label for the flat fee, when there is one. */
  flatFeeLabel: string;
  settlementSecondsRange: readonly [number, number];
  successRate30d: number;
  /** Probability this provider times out on any given request. */
  failureRate: number;
  /** Provider floor as a multiple of the corridor minimum. */
  minMultiplier: number;
  /** Provider ceiling as a fraction of the corridor maximum. */
  maxMultiplier: number;
  /** Likelihood the provider's pricing can only be estimated. */
  estimateRate: number;
  /** Likelihood we cannot verify the provider's pricing at all. */
  staleRate: number;
  paymentMethods: readonly string[];
}

function profile(p: MockProviderProfile): MockProviderProfile {
  return p;
}

const route = (host: string): string => `https://${host}/?ref=netfall&corridor={corridor}&amount={amount}`;

export const MOCK_PROVIDERS: readonly MockProviderProfile[] = [
  profile({
    slug: 'yellowcard',
    name: 'Yellow Card',
    source: 'direct',
    hasCommercialRelationship: true,
    routeUrlTemplate: route('yellowcard.io'),
    // Markets itself on zero fees and takes all of it in the rate.
    spreadBpsRange: [95, 165],
    percentFeeBps: 0,
    flatAssetFee: '0',
    flatFeeLabel: '',
    settlementSecondsRange: [120, 600],
    successRate30d: 0.982,
    failureRate: 0.06,
    minMultiplier: 1,
    maxMultiplier: 1,
    estimateRate: 0.08,
    staleRate: 0.03,
    paymentMethods: ['Bank transfer', 'Mobile money'],
  }),
  profile({
    slug: 'busha',
    name: 'Busha',
    source: 'direct',
    hasCommercialRelationship: true,
    routeUrlTemplate: route('busha.co'),
    spreadBpsRange: [55, 105],
    percentFeeBps: 45,
    flatAssetFee: '0',
    flatFeeLabel: '',
    settlementSecondsRange: [60, 300],
    successRate30d: 0.976,
    failureRate: 0.07,
    minMultiplier: 1,
    maxMultiplier: 0.4,
    estimateRate: 0.06,
    staleRate: 0.02,
    paymentMethods: ['Bank transfer', 'Card'],
  }),
  profile({
    slug: 'quidax',
    name: 'Quidax',
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: route('quidax.com'),
    spreadBpsRange: [70, 135],
    percentFeeBps: 30,
    flatAssetFee: '0',
    flatFeeLabel: '',
    settlementSecondsRange: [180, 900],
    successRate30d: 0.958,
    failureRate: 0.11,
    minMultiplier: 1,
    maxMultiplier: 0.6,
    estimateRate: 0.12,
    staleRate: 0.05,
    paymentMethods: ['Bank transfer', 'USSD'],
  }),
  profile({
    slug: 'roqqu',
    name: 'Roqqu',
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: route('roqqu.com'),
    spreadBpsRange: [115, 210],
    percentFeeBps: 0,
    flatAssetFee: '0',
    flatFeeLabel: '',
    settlementSecondsRange: [300, 1800],
    successRate30d: 0.931,
    failureRate: 0.14,
    minMultiplier: 1,
    maxMultiplier: 0.5,
    estimateRate: 0.18,
    staleRate: 0.09,
    paymentMethods: ['Bank transfer'],
  }),
  profile({
    slug: 'binance-p2p',
    name: 'Binance P2P',
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: route('p2p.binance.com'),
    // Cheapest on paper; the cost is counterparty risk and settlement time.
    spreadBpsRange: [15, 75],
    percentFeeBps: 0,
    flatAssetFee: '0',
    flatFeeLabel: '',
    settlementSecondsRange: [900, 5400],
    successRate30d: 0.907,
    failureRate: 0.09,
    minMultiplier: 1,
    maxMultiplier: 1,
    estimateRate: 0.22,
    staleRate: 0.06,
    paymentMethods: ['Bank transfer', 'Mobile money'],
  }),
  profile({
    slug: 'bitnob',
    name: 'Bitnob',
    source: 'direct',
    hasCommercialRelationship: true,
    routeUrlTemplate: route('bitnob.com'),
    spreadBpsRange: [80, 145],
    percentFeeBps: 25,
    flatAssetFee: '0.50',
    flatFeeLabel: 'Network withdrawal fee',
    settlementSecondsRange: [60, 240],
    successRate30d: 0.973,
    failureRate: 0.08,
    minMultiplier: 1,
    maxMultiplier: 0.7,
    estimateRate: 0.07,
    staleRate: 0.02,
    paymentMethods: ['Bank transfer', 'Mobile money'],
  }),
  profile({
    slug: 'accrue',
    name: 'Accrue',
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: route('accrue.so'),
    spreadBpsRange: [100, 175],
    percentFeeBps: 0,
    flatAssetFee: '0',
    flatFeeLabel: '',
    settlementSecondsRange: [120, 600],
    successRate30d: 0.964,
    failureRate: 0.1,
    minMultiplier: 1,
    // A low ceiling: large amounts fall outside this provider's limits.
    maxMultiplier: 0.02,
    estimateRate: 0.1,
    staleRate: 0.04,
    paymentMethods: ['Bank transfer', 'Mobile money'],
  }),
  profile({
    slug: 'juicyway',
    name: 'Juicyway',
    source: 'direct',
    hasCommercialRelationship: true,
    routeUrlTemplate: route('juicyway.com'),
    spreadBpsRange: [50, 100],
    percentFeeBps: 50,
    flatAssetFee: '0',
    flatFeeLabel: '',
    settlementSecondsRange: [300, 1200],
    successRate30d: 0.969,
    failureRate: 0.09,
    minMultiplier: 2,
    maxMultiplier: 0.06,
    estimateRate: 0.11,
    staleRate: 0.03,
    paymentMethods: ['Bank transfer'],
  }),
  profile({
    slug: 'fonbnk',
    name: 'Fonbnk',
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: route('fonbnk.com'),
    // Airtime-backed: fast and small, and expensive for what it is.
    spreadBpsRange: [190, 330],
    percentFeeBps: 0,
    flatAssetFee: '0',
    flatFeeLabel: '',
    settlementSecondsRange: [60, 300],
    successRate30d: 0.944,
    failureRate: 0.12,
    minMultiplier: 1,
    maxMultiplier: 0.012,
    estimateRate: 0.14,
    staleRate: 0.07,
    paymentMethods: ['Mobile money', 'Airtime'],
  }),
  profile({
    slug: 'luno',
    name: 'Luno',
    source: 'direct',
    hasCommercialRelationship: false,
    routeUrlTemplate: route('luno.com'),
    spreadBpsRange: [90, 155],
    percentFeeBps: 60,
    flatAssetFee: '0',
    flatFeeLabel: '',
    settlementSecondsRange: [300, 1800],
    successRate30d: 0.961,
    failureRate: 0.08,
    minMultiplier: 1,
    maxMultiplier: 0.8,
    estimateRate: 0.09,
    staleRate: 0.03,
    paymentMethods: ['Bank transfer', 'M-Pesa'],
  }),
  profile({
    slug: 'transak',
    name: 'Transak',
    source: 'aggregator',
    hasCommercialRelationship: true,
    routeUrlTemplate: route('global.transak.com'),
    spreadBpsRange: [135, 225],
    percentFeeBps: 99,
    flatAssetFee: '0',
    flatFeeLabel: '',
    settlementSecondsRange: [180, 900],
    successRate30d: 0.951,
    failureRate: 0.1,
    // A high floor: small amounts fall below this provider's minimum.
    minMultiplier: 3,
    maxMultiplier: 0.9,
    estimateRate: 0.16,
    staleRate: 0.05,
    paymentMethods: ['Card', 'Bank transfer'],
  }),
  profile({
    slug: 'moonpay',
    name: 'MoonPay',
    source: 'aggregator',
    hasCommercialRelationship: true,
    routeUrlTemplate: route('buy.moonpay.com'),
    spreadBpsRange: [155, 270],
    percentFeeBps: 145,
    flatAssetFee: '0.99',
    flatFeeLabel: 'Network withdrawal fee',
    settlementSecondsRange: [120, 600],
    successRate30d: 0.948,
    failureRate: 0.09,
    minMultiplier: 5,
    maxMultiplier: 0.85,
    estimateRate: 0.13,
    staleRate: 0.04,
    paymentMethods: ['Card', 'Apple Pay', 'Bank transfer'],
  }),
];

const BY_SLUG = new Map(MOCK_PROVIDERS.map((p) => [p.slug, p]));

export function getMockProvider(slug: string): MockProviderProfile | null {
  return BY_SLUG.get(slug) ?? null;
}

export function providerName(slug: string): string {
  return BY_SLUG.get(slug)?.name ?? slug;
}

export function providerSource(slug: string): QuoteSource {
  return BY_SLUG.get(slug)?.source ?? 'direct';
}

export const PROVIDER_COUNT = MOCK_PROVIDERS.length;

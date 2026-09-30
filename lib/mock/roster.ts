import type { CorridorSlug } from '../types';

/**
 * The dev mock's provider roster per corridor. Development and tests only:
 * it includes venues with no live integration so the harness can exercise
 * wide boards. Production reads the live registry and never this file.
 */

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

const MOCK_ROSTER: Readonly<Record<string, readonly string[]>> = {
  'ngn-usdt': NGN_PROVIDERS_USDT,
  'ngn-usdc': NGN_PROVIDERS_USDC,
  'ghs-usdt': GHS_PROVIDERS,
  'ghs-usdc': GHS_PROVIDERS_USDC,
  'kes-usdt': KES_PROVIDERS,
  'kes-usdc': KES_PROVIDERS_USDC,
};

export function mockRosterFor(slug: CorridorSlug): readonly string[] {
  return MOCK_ROSTER[slug] ?? [];
}

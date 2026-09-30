import { decimalStringFrom, fetchJsonCached, UpstreamError } from './http';
import { divide, multiply, type Money } from '../money';
import type { AssetCode, FiatCode } from '../types';

/**
 * The reference rate every ledger opens with: how much of the asset one unit
 * of fiat buys at interbank/exchange reference prices, before any provider
 * has taken anything.
 *
 * Composed from two live sources:
 *   - open.er-api.com    USD -> NGN/GHS/KES interbank reference, free, keyless,
 *                        refreshed daily upstream
 *   - api.coingecko.com  USDT and USDC in USD, free, keyless
 *
 * The composition is deliberate: no single free source quotes cedi or
 * shilling against the stablecoins directly. The label shown to users names
 * this as an interbank reference, because for the naira especially the
 * street price of dollars has historically diverged from the official one —
 * that divergence is part of what a provider's "rate margin" line measures,
 * and pretending otherwise would understate real costs.
 */

const ERAPI_URL = 'https://open.er-api.com/v6/latest/USD';
const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=tether,usd-coin&vs_currencies=usd';

const ASSET_IDS: Record<AssetCode, string> = { USDT: 'tether', USDC: 'usd-coin' };

export interface MidMarket {
  /** Units of fiat per one unit of the asset, e.g. "1327.24" NGN per USDT. */
  fiatPerAsset: Money;
  /** Where the two halves came from, for the ledger label and provenance. */
  sources: readonly string[];
  asOf: string; // ISO 8601
  /** True when either half came from a held last-good read. */
  stale: boolean;
}

export async function midMarket(from: FiatCode, to: AssetCode): Promise<MidMarket> {
  const [fx, cg] = await Promise.all([
    fetchJsonCached(ERAPI_URL, { revalidateSeconds: 3600 }),
    fetchJsonCached(COINGECKO_URL, { revalidateSeconds: 120 }),
  ]);

  const rates = (fx.data as { rates?: Record<string, unknown> })?.rates;
  const fiatPerUsd = decimalStringFrom(rates?.[from]);
  if (!fiatPerUsd) throw new UpstreamError(`er-api: no ${from} rate in payload`, 'shape');

  const assetUsd = decimalStringFrom(
    (cg.data as Record<string, { usd?: unknown }>)?.[ASSET_IDS[to]]?.usd,
  );
  if (!assetUsd) throw new UpstreamError(`coingecko: no ${to} price in payload`, 'shape');

  // fiat per asset = (fiat per USD) x (USD per asset)
  const fiatPerAsset = multiply(fiatPerUsd, assetUsd);

  return {
    fiatPerAsset,
    sources: ['open.er-api.com', 'coingecko.com'],
    asOf: new Date().toISOString(),
    stale: fx.staleAgeMs !== null || cg.staleAgeMs !== null,
  };
}

/** Gross asset amount at the reference rate, to the asset's display scale. */
export function grossAtReference(amount: Money, fiatPerAsset: Money): Money {
  return divide(amount, fiatPerAsset, 8);
}

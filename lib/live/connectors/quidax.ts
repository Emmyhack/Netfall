import { decimalStringFrom, fetchJsonCached, UpstreamError } from '../http';
import { grossAtReference, midMarket } from '../midmarket';
import { divide, round, subtract } from '../../money';
import type { CorridorMeta, FeeLine, Quote } from '../../types';
import { liveProvider } from '../registry';
import { expiry, type ConnectorResult } from './types';

/**
 * Quidax — verified live against their public API on 2026-09-30 from this
 * codebase: markets usdtngn and usdtghs quote real tickers with no
 * authentication, and usdcusdt provides the cross into USDC. There are no
 * KES markets.
 *
 * Pricing basis, stated exactly because the confidence level depends on it:
 * buying the asset with fiat executes against the ask, so the ticker's
 * `sell` price is used. It is top-of-book with no depth guarantee, and
 * platform withdrawal or network fees are not included because Quidax does
 * not publish them on this endpoint — so every quote from this connector is
 * `estimated`, and the ledger carries one margin line measuring the whole
 * gap against the interbank reference rather than an invented fee itemisation.
 */

const BASE = 'https://app.quidax.io/api/v1';

interface Ticker {
  sell: string;
  stale: boolean;
}

async function ticker(market: string): Promise<Ticker> {
  const read = await fetchJsonCached(`${BASE}/markets/tickers/${market}`, {
    revalidateSeconds: 30,
  });
  const payload = read.data as { status?: string; data?: { ticker?: { sell?: unknown } } };

  const sell = decimalStringFrom(payload?.data?.ticker?.sell);
  if (payload?.status !== 'success' || !sell) {
    throw new UpstreamError(`quidax ${market}: no usable sell price`, 'shape');
  }
  return { sell, stale: read.staleAgeMs !== null };
}

export async function quidaxQuote(
  corridor: CorridorMeta,
  amount: string,
): Promise<ConnectorResult> {
  const provider = liveProvider('quidax');
  if (!provider) return { kind: 'unavailable', reason: 'provider_down' };

  try {
    const fiat = corridor.from.toLowerCase();
    const [reference, usdtBook] = await Promise.all([
      midMarket(corridor.from, corridor.to),
      ticker(`usdt${fiat}`),
    ]);

    // Fiat -> USDT at the ask.
    let landed = divide(amount, usdtBook.sell, 8);
    let anyStale = usdtBook.stale || reference.stale;

    // USDT -> USDC through the usdcusdt book when the corridor wants USDC.
    if (corridor.to === 'USDC') {
      const usdcBook = await ticker('usdcusdt');
      landed = divide(landed, usdcBook.sell, 8);
      anyStale = anyStale || usdcBook.stale;
    }

    const landedRounded = round(landed, 2);
    const gross = round(grossAtReference(amount, reference.fiatPerAsset), 2);

    // One margin line, measuring everything between the reference and what
    // actually lands. It can be positive when the venue beats the interbank
    // reference — for the naira that is a real market condition, not a bug.
    const margin = subtract(landedRounded, gross);

    const feeBreakdown: FeeLine[] = [
      { label: 'At interbank reference rate', amount: gross, currency: corridor.to },
      { label: 'Exchange rate margin', amount: margin, currency: corridor.to },
    ];

    const quote: Quote = {
      provider: provider.slug,
      providerName: provider.name,
      source: provider.source,
      landedAmount: landedRounded,
      effectiveRate: divide(landedRounded, amount, 12),
      feeBreakdown,
      paymentMethods: corridor.from === 'NGN' ? ['Bank transfer'] : [],
      // Top-of-book without depth is an estimate; a figure built on a held
      // last-good read is one step weaker, and says so.
      confidence: anyStale ? 'insufficient_data' : 'estimated',
      hasCommercialRelationship: provider.hasCommercialRelationship,
      routeUrl: provider.routeUrlTemplate,
    };

    return { kind: 'quote', quote };
  } catch (error) {
    if (error instanceof UpstreamError) {
      return { kind: 'unavailable', reason: error.kind === 'timeout' ? 'timeout' : 'provider_down' };
    }
    return { kind: 'unavailable', reason: 'provider_down' };
  }
}

export { expiry as quidaxExpiry };

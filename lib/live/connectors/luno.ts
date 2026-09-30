import { decimalStringFrom, fetchJsonCached, UpstreamError } from '../http';
import { grossAtReference, midMarket } from '../midmarket';
import { divide, round, subtract } from '../../money';
import type { CorridorMeta, FeeLine, Quote } from '../../types';
import { liveProvider } from '../registry';
import type { ConnectorResult } from './types';

/**
 * Luno — the keyless public tickers endpoint.
 *
 * Written to their documented payload but NOT verified live from the network
 * this was built on: api.luno.com does not resolve here. The connector
 * self-truths at runtime instead of trusting a hardcoded market list — it
 * reads the pairs Luno actually serves and declines any corridor whose pair
 * is absent, so a market they have exited reports as unsupported rather
 * than being guessed at.
 *
 * Pricing basis: the pair's ask, top-of-book, fees not included — every
 * quote is `estimated`.
 */

const TICKERS_URL = 'https://api.luno.com/api/1/tickers';

export async function lunoQuote(
  corridor: CorridorMeta,
  amount: string,
): Promise<ConnectorResult> {
  const provider = liveProvider('luno');
  if (!provider) return { kind: 'unavailable', reason: 'provider_down' };

  try {
    const [reference, read] = await Promise.all([
      midMarket(corridor.from, corridor.to),
      fetchJsonCached(TICKERS_URL, { revalidateSeconds: 30 }),
    ]);

    const tickers = (read.data as { tickers?: unknown })?.tickers;
    if (!Array.isArray(tickers)) {
      throw new UpstreamError('luno: unexpected tickers payload', 'shape');
    }

    const wanted = `${corridor.to}${corridor.from}`.toUpperCase();
    const match = tickers.find(
      (t) => (t as { pair?: unknown })?.pair === wanted,
    ) as { ask?: unknown } | undefined;

    if (!match) return { kind: 'unavailable', reason: 'corridor_unsupported' };

    const ask = decimalStringFrom(match.ask);
    if (!ask) return { kind: 'unavailable', reason: 'insufficient_data' };

    const landed = round(divide(amount, ask, 8), 2);
    const gross = round(grossAtReference(amount, reference.fiatPerAsset), 2);
    const margin = subtract(landed, gross);

    const feeBreakdown: FeeLine[] = [
      { label: 'At interbank reference rate', amount: gross, currency: corridor.to },
      { label: 'Exchange rate margin', amount: margin, currency: corridor.to },
    ];

    const quote: Quote = {
      provider: provider.slug,
      providerName: provider.name,
      source: provider.source,
      landedAmount: landed,
      effectiveRate: divide(landed, amount, 12),
      feeBreakdown,
      paymentMethods: [],
      confidence: read.staleAgeMs !== null || reference.stale ? 'insufficient_data' : 'estimated',
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

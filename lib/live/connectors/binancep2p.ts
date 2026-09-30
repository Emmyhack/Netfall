import { decimalStringFrom, fetchJson, numberFrom, UpstreamError } from '../http';
import { grossAtReference, midMarket } from '../midmarket';
import { divide, round, subtract } from '../../money';
import type { CorridorMeta, FeeLine, Quote } from '../../types';
import { liveProvider } from '../registry';
import type { ConnectorResult } from './types';

/**
 * Binance P2P — the public advert search their own web client uses.
 *
 * Honesty note on verification: this connector is written to the payload
 * shape that endpoint serves, but it could NOT be verified live from the
 * network this code was built on — DNS for p2p.binance.com does not resolve
 * here at all, which is a real condition in several jurisdictions. Where
 * that is the case at runtime, this connector degrades to exactly what is
 * true: the provider appears as unreachable. Nothing is synthesised in its
 * place.
 *
 * Pricing basis: BUY-side adverts, filtered to those whose single-trade
 * limits contain the requested amount. A price from an advert that accepts
 * the amount is a live executable offer, so it carries `exact` confidence;
 * when no advert's limits fit, the best available advert prices the quote
 * and it drops to `estimated`. P2P trades carry no platform fee, so the
 * ledger is the reference line plus one margin line.
 */

const SEARCH_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

/** POSTs are uncacheable by the framework, so results memoise here briefly. */
const memo = new Map<string, { at: number; ads: Ad[] }>();
const MEMO_TTL_MS = 30_000;

interface Ad {
  price: string;
  min: number | null;
  max: number | null;
  methods: string[];
}

function parseAds(payload: unknown): Ad[] {
  const rows = (payload as { code?: string; data?: unknown })?.data;
  if (!Array.isArray(rows)) {
    throw new UpstreamError('binance p2p: unexpected search payload', 'shape');
  }
  const ads: Ad[] = [];
  for (const row of rows) {
    const adv = (row as { adv?: Record<string, unknown> })?.adv;
    const price = decimalStringFrom(adv?.price);
    if (!price) continue;
    const methods = Array.isArray(adv?.tradeMethods)
      ? (adv?.tradeMethods as { tradeMethodName?: unknown }[])
          .map((m) => (typeof m.tradeMethodName === 'string' ? m.tradeMethodName : null))
          .filter((m): m is string => m !== null)
      : [];
    ads.push({
      price,
      min: numberFrom(adv?.minSingleTransAmount),
      max: numberFrom(adv?.dynamicMaxSingleTransAmount ?? adv?.maxSingleTransAmount),
      methods,
    });
  }
  return ads;
}

async function searchAds(fiat: string, asset: string): Promise<{ ads: Ad[]; stale: boolean }> {
  const key = `${fiat}:${asset}`;
  const cached = memo.get(key);
  if (cached && Date.now() - cached.at < MEMO_TTL_MS) return { ads: cached.ads, stale: false };

  let payload: unknown;
  try {
    payload = await fetchJson(SEARCH_URL, {
    method: 'POST',
    body: {
      fiat,
      asset,
      tradeType: 'BUY',
      page: 1,
      rows: 10,
      payTypes: [],
      publisherType: null,
    },
    });
  } catch (error) {
    // A held advert list within ten minutes beats a blank; the caller
    // downgrades the quote's confidence for it.
    if (cached && Date.now() - cached.at <= 10 * 60 * 1000) {
      return { ads: cached.ads, stale: true };
    }
    throw error;
  }

  const ads = parseAds(payload);
  memo.set(key, { at: Date.now(), ads });
  return { ads, stale: false };
}

export async function binanceP2pQuote(
  corridor: CorridorMeta,
  amount: string,
): Promise<ConnectorResult> {
  const provider = liveProvider('binance-p2p');
  if (!provider) return { kind: 'unavailable', reason: 'provider_down' };

  try {
    const [reference, book] = await Promise.all([
      midMarket(corridor.from, corridor.to),
      searchAds(corridor.from, corridor.to),
    ]);
    const { ads } = book;

    if (ads.length === 0) {
      // The venue answered and lists nothing for this pair — for example the
      // naira, delisted there in 2024. That is a real market fact.
      return { kind: 'unavailable', reason: 'corridor_unsupported' };
    }

    // The comparison amount is a plotting bound here, not money arithmetic.
    const amountNumber = Number(amount);
    const within = ads.filter(
      (ad) =>
        (ad.min === null || amountNumber >= ad.min) &&
        (ad.max === null || amountNumber <= ad.max),
    );
    const pool = within.length > 0 ? within : ads;

    // Lowest fiat price is the best buy. String compare is wrong for
    // numbers, so this one comparison goes through the money module.
    const best = pool.reduce((a, b) => (Number(divide(a.price, b.price, 8)) <= 1 ? a : b));

    const landed = round(divide(amount, best.price, 8), 2);
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
      paymentMethods: best.methods.slice(0, 3),
      confidence:
        book.stale || reference.stale
          ? 'insufficient_data'
          : within.length > 0
            ? 'exact'
            : 'estimated',
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

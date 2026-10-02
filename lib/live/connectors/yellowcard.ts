import { createHash, createHmac } from 'node:crypto';
import { decimalStringFrom, requestJsonRaw, UpstreamError } from '../http';
import { grossAtReference, midMarket } from '../midmarket';
import { sharedCache } from '../shared';
import { divide, round, subtract } from '../../money';
import type { CorridorMeta, FeeLine, Quote } from '../../types';
import { liveProvider } from '../registry';
import type { ConnectorResult } from './types';

/**
 * Yellow Card — business Payments API, GET /business/rates.
 *
 * Contract, from docs.yellowcard.engineering (get-rates, using-rates-data,
 * authentication-api), read 2026-10-02:
 *   - rates are "local currency to the United States Dollar"; `buy` is the
 *     rate at which the end user buys, so it is the on-ramp price.
 *   - every request is HMAC-SHA256 signed: base64(hmac(secret,
 *     timestamp + path + METHOD [+ base64(sha256(body)) for POST/PUT])),
 *     path including the /business prefix and excluding the query string,
 *     sent as `Authorization: YcHmacV1 {key}:{signature}` with the same
 *     timestamp in `X-YC-Timestamp`.
 *   - production requests must come from an allow-listed IP.
 *
 * Credentials come from YELLOWCARD_API_KEY / YELLOWCARD_SECRET_KEY. Without
 * them the provider stays not_configured, which is the truth.
 *
 * Pricing basis: the docs do not say whether fees sit outside the rate or
 * how the dollar rate maps onto USDT/USDC, so the stablecoin is taken at
 * dollar parity and every quote is `estimated`, with one margin line
 * measuring the whole gap to the interbank reference.
 */

const DEFAULT_BASE = 'https://api.yellowcard.io/business';
const LOCALE: Readonly<Record<string, string>> = { NGN: 'NG', GHS: 'GH', KES: 'KE' };

export function yellowCardConfigured(): boolean {
  return Boolean(process.env.YELLOWCARD_API_KEY && process.env.YELLOWCARD_SECRET_KEY);
}

/** Exported for the signing test; the message layout is the contract. */
export function signYellowCard(
  secret: string,
  timestamp: string,
  path: string,
  method: string,
  body?: string,
): string {
  const upper = method.toUpperCase();
  let message = `${timestamp}${path}${upper}`;
  if ((upper === 'POST' || upper === 'PUT') && body !== undefined) {
    message += createHash('sha256').update(body).digest('base64');
  }
  return createHmac('sha256', secret).update(message).digest('base64');
}

interface Rate {
  buy: string;
  updatedAt: number | null;
}

async function fetchRate(fiat: string): Promise<Rate> {
  const key = process.env.YELLOWCARD_API_KEY ?? '';
  const secret = process.env.YELLOWCARD_SECRET_KEY ?? '';
  const base = (process.env.YELLOWCARD_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
  const url = new URL(`${base}/rates`);
  url.searchParams.set('currency', fiat);

  const timestamp = new Date().toISOString();
  const signature = signYellowCard(secret, timestamp, url.pathname, 'GET');
  const payload = (await requestJsonRaw(url.toString(), {
    headers: {
      'X-YC-Timestamp': timestamp,
      Authorization: `YcHmacV1 ${key}:${signature}`,
    },
  })) as { rates?: unknown };

  return parseRate(payload, fiat);
}

/** Exported for tests: picks the corridor's rate out of a /rates payload. */
export function parseRate(payload: unknown, fiat: string): Rate {
  const rates = (payload as { rates?: unknown })?.rates;
  if (!Array.isArray(rates)) throw new UpstreamError('yellowcard: no rates array', 'shape');
  const locale = LOCALE[fiat];
  const row = (rates as Record<string, unknown>[]).find(
    (r) => r.code === fiat && (locale === undefined || r.locale === undefined || r.locale === locale),
  );
  const buy = decimalStringFrom(row?.buy);
  if (!row || !buy) throw new UpstreamError(`yellowcard: no buy rate for ${fiat}`, 'shape');
  const updatedAt = typeof row.updatedAt === 'number' ? row.updatedAt : null;
  return { buy, updatedAt };
}

/** A rate Yellow Card itself last updated longer ago than this is not current. */
const RATE_STALE_MS = 15 * 60 * 1000;

export async function yellowCardQuote(
  corridor: CorridorMeta,
  amount: string,
): Promise<ConnectorResult> {
  const provider = liveProvider('yellowcard');
  if (!provider) return { kind: 'unavailable', reason: 'provider_down' };
  if (!yellowCardConfigured()) return { kind: 'unavailable', reason: 'not_configured' };

  try {
    const [reference, rate] = await Promise.all([
      midMarket(corridor.from, corridor.to),
      sharedCache(['yellowcard', corridor.from], 30, () => fetchRate(corridor.from)),
    ]);

    const landed = round(divide(amount, rate.buy, 8), 2);
    const gross = round(grossAtReference(amount, reference.fiatPerAsset), 2);
    const feeBreakdown: FeeLine[] = [
      { label: 'At interbank reference rate', amount: gross, currency: corridor.to },
      { label: 'Exchange rate margin', amount: subtract(landed, gross), currency: corridor.to },
    ];
    const rateIsOld = rate.updatedAt !== null && Date.now() - rate.updatedAt > RATE_STALE_MS;

    const quote: Quote = {
      provider: provider.slug,
      providerName: provider.name,
      source: provider.source,
      landedAmount: landed,
      effectiveRate: divide(landed, amount, 12),
      feeBreakdown,
      paymentMethods: [],
      confidence: reference.stale || rateIsOld ? 'insufficient_data' : 'estimated',
      hasCommercialRelationship: provider.hasCommercialRelationship,
      routeUrl: provider.routeUrlTemplate,
    };
    return { kind: 'quote', quote };
  } catch (error) {
    if (error instanceof UpstreamError && error.kind === 'timeout') {
      return { kind: 'unavailable', reason: 'timeout' };
    }
    return { kind: 'unavailable', reason: 'provider_down' };
  }
}

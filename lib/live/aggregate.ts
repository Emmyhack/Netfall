import { getCorridor } from '../corridors';
import { dispersionBps, isValidDecimalString } from '../money';
import { rankQuotes } from '../quotes/ranking';
import type { Quote, QuoteResponse, UnavailableQuote } from '../types';
import { binanceP2pQuote } from './connectors/binancep2p';
import { lunoQuote } from './connectors/luno';
import { quidaxQuote } from './connectors/quidax';
import { LIVE_QUOTE_TTL_SECONDS, expiry, type ConnectorResult } from './connectors/types';
import { liveProvidersFor, type LiveProvider } from './registry';

/**
 * Server-side quoting against the live connectors. The client fan-out uses
 * the per-provider route for progressive arrival; pages and build-time reads
 * call this directly in-process.
 */

const CONNECTORS: Record<string, (corridor: NonNullable<ReturnType<typeof getCorridor>>, amount: string) => Promise<ConnectorResult>> = {
  quidax: quidaxQuote,
  'binance-p2p': binanceP2pQuote,
  luno: lunoQuote,
};

export async function quoteFromProvider(
  slug: string,
  corridorSlug: string,
  amount: string,
): Promise<{ result: ConnectorResult; expiresAt: string } | { error: string }> {
  const corridor = getCorridor(corridorSlug);
  if (!corridor) return { error: 'corridor_unsupported' };
  if (!isValidDecimalString(amount)) return { error: 'amount_invalid' };

  const provider = liveProvidersFor(corridor.slug).find((p) => p.slug === slug);
  if (!provider) return { error: 'provider_unknown' };

  if (!provider.integrated) {
    return { result: { kind: 'unavailable', reason: 'not_configured' }, expiresAt: expiry() };
  }

  const connector = CONNECTORS[slug];
  if (!connector) {
    return { result: { kind: 'unavailable', reason: 'not_configured' }, expiresAt: expiry() };
  }

  const result = await connector(corridor, amount);
  return { result, expiresAt: expiry() };
}

export async function aggregate(
  corridorSlug: string,
  amount: string,
): Promise<QuoteResponse | null> {
  const corridor = getCorridor(corridorSlug);
  if (!corridor || !isValidDecimalString(amount)) return null;

  const providers = liveProvidersFor(corridor.slug);
  const settled = await Promise.allSettled(
    providers.map(async (provider: LiveProvider) => ({
      provider,
      outcome: provider.integrated
        ? await (CONNECTORS[provider.slug]?.(corridor, amount) ??
            Promise.resolve<ConnectorResult>({ kind: 'unavailable', reason: 'not_configured' }))
        : ({ kind: 'unavailable', reason: 'not_configured' } as ConnectorResult),
    })),
  );

  const quotes: Quote[] = [];
  const unavailable: UnavailableQuote[] = [];
  settled.forEach((entry, index) => {
    const provider = providers[index] as LiveProvider;
    if (entry.status === 'rejected') {
      unavailable.push({ provider: provider.slug, providerName: provider.name, reason: 'provider_down' });
      return;
    }
    const { outcome } = entry.value;
    if (outcome.kind === 'quote') quotes.push(outcome.quote);
    else unavailable.push({ provider: provider.slug, providerName: provider.name, reason: outcome.reason });
  });

  const ranked = rankQuotes(quotes);
  const now = Date.now();
  return {
    requestId: `req_${now.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
    corridor: corridor.id,
    inputAmount: amount,
    generatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + LIVE_QUOTE_TTL_SECONDS * 1000).toISOString(),
    dispersionBps: dispersionBps(ranked.map((q) => q.landedAmount)),
    quotes: ranked,
    unavailable,
  };
}

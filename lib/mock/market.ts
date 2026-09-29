import type { Money } from '../money';

/**
 * Mid-market reference rates, expressed as units of fiat per 1 unit of the
 * asset — the direction people actually quote in conversation.
 *
 * LIVE: the engine sources these from the reference-rate feed and they move
 * continuously. Here they are fixed so seeded runs stay reproducible.
 */
export const MID_MARKET_FIAT_PER_ASSET: Readonly<Record<string, Money>> = {
  'ngn-usdt': '1580.40',
  'ngn-usdc': '1579.85',
  'ghs-usdt': '15.62',
  'ghs-usdc': '15.60',
  'kes-usdt': '129.45',
  'kes-usdc': '129.38',
};

export function midMarketRate(corridorSlug: string): Money | null {
  return MID_MARKET_FIAT_PER_ASSET[corridorSlug] ?? null;
}

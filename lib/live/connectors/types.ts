import type { CorridorMeta, Quote, UnavailableReason } from '../../types';

/** What a connector returns: a priced quote, or an honest absence. */
export type ConnectorResult =
  | { kind: 'quote'; quote: Quote }
  | { kind: 'unavailable'; reason: UnavailableReason };

export type Connector = (corridor: CorridorMeta, amount: string) => Promise<ConnectorResult>;

/** How long a live figure is presented as current. */
export const LIVE_QUOTE_TTL_SECONDS = 60;

export function expiry(): string {
  return new Date(Date.now() + LIVE_QUOTE_TTL_SECONDS * 1000).toISOString();
}

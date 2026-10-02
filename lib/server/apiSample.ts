import { aggregate } from '../live/aggregate';
import { SITE_URL } from '../site';

/** The documented example request, against this deployment's own origin. */
export const SAMPLE_ENDPOINT = `${SITE_URL}/api/v1/quote?corridor=ngn-usdt&amount=500000`;

/**
 * A real /api/v1/quote response, captured when the calling page regenerates
 * and trimmed for reading. Pages show this instead of a hand-written example
 * so no figure attributed to a real provider is ever invented.
 */
export async function liveApiSample(
  options: { quotes?: number; unavailable?: number } = {},
): Promise<{ json: string; at: string } | null> {
  const { quotes = 2, unavailable = 3 } = options;
  const response = await aggregate('ngn-usdt', '500000').catch(() => null);
  if (!response) return null;
  const trimmed = {
    ...response,
    quotes: response.quotes.slice(0, quotes),
    unavailable: response.unavailable.slice(0, unavailable),
  };
  return { json: JSON.stringify(trimmed, null, 2), at: response.generatedAt };
}

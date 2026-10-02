import { aggregate } from '@/lib/live/aggregate';
import {
  amountFromParam,
  apiError,
  corridorFromParam,
  isApiError,
  PUBLIC_API_HEADERS,
} from '@/lib/server/publicApi';
import { rateLimit, rateLimitHeaders, tooManyRequests } from '@/lib/server/ratelimit';

/**
 * The public comparison endpoint: every provider in a corridor, ranked by
 * landed amount, with the ones that could not quote and why. Free, keyless
 * and CORS-open; fair use is enforced per IP.
 *
 *   GET /api/v1/quote?corridor=ngn-usdt&amount=500000
 */
export const dynamic = 'force-dynamic';

const LIMIT_PER_MINUTE = 60;

export async function GET(request: Request) {
  const limited = await rateLimit(request, 'api-quote', LIMIT_PER_MINUTE, 60);
  if (!limited.allowed) return tooManyRequests(limited);

  const url = new URL(request.url);
  const corridor = corridorFromParam(url.searchParams.get('corridor'));
  if (isApiError(corridor)) return apiError(corridor, rateLimitHeaders(limited));
  const amount = amountFromParam(url.searchParams.get('amount'), corridor);
  if (isApiError(amount)) return apiError(amount, rateLimitHeaders(limited));

  const response = await aggregate(corridor.slug, amount);
  if (!response) {
    return apiError({ status: 502, error: 'quote_failed', message: 'The comparison could not be assembled.' });
  }

  return Response.json(response, {
    headers: {
      ...PUBLIC_API_HEADERS,
      ...rateLimitHeaders(limited),
      'Vercel-CDN-Cache-Control': 'max-age=10',
    },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: PUBLIC_API_HEADERS });
}

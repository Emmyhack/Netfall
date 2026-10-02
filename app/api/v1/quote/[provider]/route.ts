import { NextResponse } from 'next/server';
import { quoteFromProvider } from '@/lib/live/aggregate';

/**
 * One provider, one corridor, one amount — the endpoint the client fans out
 * to so rows arrive as each venue answers, with each venue's failure
 * isolated to its own request.
 *
 * Browsers never cache it. Vercel's CDN holds an identical request (same
 * provider, corridor and amount — most visitors keep the default amount)
 * for a few seconds, so a crowd on one page costs one upstream round. The
 * quote's own expiresAt is computed at generation, so a CDN-held answer
 * simply has less life left, and the client renews it on time.
 */
export const dynamic = 'force-dynamic';

/*
 * Region is set project-wide in vercel.json (fra1): Vercel's default US
 * region is geo-blocked by Binance, and Frankfurt is well peered to Lagos,
 * Accra and Nairobi.
 */

const CDN_SECONDS = 10;

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  const corridor = url.searchParams.get('corridor') ?? '';
  const amount = url.searchParams.get('amount') ?? '';

  const outcome = await quoteFromProvider(provider, corridor, amount);

  if ('error' in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  }

  return NextResponse.json(outcome, {
    headers: {
      'Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': `max-age=${CDN_SECONDS}`,
    },
  });
}

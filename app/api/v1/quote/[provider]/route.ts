import { NextResponse } from 'next/server';
import { quoteFromProvider } from '@/lib/live/aggregate';

/**
 * One provider, one corridor, one amount — the endpoint the client fans out
 * to so rows arrive as each venue answers, with each venue's failure
 * isolated to its own request.
 *
 * Responses are not cached at this layer: the amount varies per user, and
 * the underlying market fetches carry their own 30-second windows, which is
 * where the actual rate limiting protection lives.
 */
export const dynamic = 'force-dynamic';

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
    headers: { 'Cache-Control': 'no-store' },
  });
}

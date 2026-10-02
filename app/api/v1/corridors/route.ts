import { CORRIDORS } from '@/lib/corridors';
import { providersFor } from '@/lib/live/registry-core';
import { isLive } from '@/lib/live/configured';
import { PUBLIC_API_HEADERS } from '@/lib/server/publicApi';

/** What the quote endpoint accepts: corridors, their public range, and who is live. */
export const dynamic = 'force-dynamic';

export function GET() {
  const corridors = CORRIDORS.map((c) => ({
    corridor: c.slug,
    id: c.id,
    from: c.from,
    to: c.to,
    minAmount: c.minAmount,
    maxPublicAmount: c.otcThreshold,
    defaultAmount: c.defaultAmount,
    providers: providersFor(c.slug).map((p) => ({ slug: p.slug, name: p.name, live: isLive(p.slug) })),
  }));
  return Response.json(
    { corridors },
    { headers: { ...PUBLIC_API_HEADERS, 'Vercel-CDN-Cache-Control': 'max-age=300' } },
  );
}

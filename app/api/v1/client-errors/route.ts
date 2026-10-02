import { rateLimit } from '@/lib/server/ratelimit';

/**
 * Receives error-boundary reports from browsers and writes them to the
 * server log as one JSON line each. Accepts only a digest, a short message
 * and a path; anything else in the body is ignored, and the visitor's IP is
 * not logged here.
 */
export const dynamic = 'force-dynamic';

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : null);

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'client-errors', 30, 60);
  if (!limited.allowed) return new Response(null, { status: 204 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body) {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        event: 'client_error',
        digest: clip(body.digest, 64),
        message: clip(body.message, 300),
        path: clip(body.path, 200),
      }),
    );
  }
  return new Response(null, { status: 204 });
}

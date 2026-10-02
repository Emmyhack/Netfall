import { pipeline, redisConfigured } from './redis';

/**
 * Fixed-window rate limiting per client IP, shared across every server
 * instance through Redis. Without Redis it allows everything — the Vercel
 * firewall rule documented in DEPLOY.md is the backstop — and it also
 * allows everything if Redis itself errors: a limiter outage must not take
 * the comparison down with it.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function rateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const open: RateLimitResult = { allowed: true, limit, remaining: limit, resetSeconds: windowSeconds };
  if (!redisConfigured()) return open;

  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `rl:${bucket}:${clientIp(request)}:${window}`;
  try {
    const [count] = await pipeline<[number, number]>([
      ['INCR', key],
      ['EXPIRE', key, windowSeconds],
    ]);
    const resetSeconds = windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);
    return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), resetSeconds };
  } catch {
    return open;
  }
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(result.resetSeconds),
  };
}

export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { error: 'rate_limited', message: 'Too many requests. Slow down and retry after the reset.' },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        'Retry-After': String(result.resetSeconds),
        'Cache-Control': 'no-store',
      },
    },
  );
}

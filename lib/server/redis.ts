/**
 * A minimal Upstash Redis REST client — the store behind rate limiting,
 * alerts, enquiries and price history. Plain fetch, no SDK, so nothing new
 * enters the bundle or the dependency tree.
 *
 * Reads the variable names Vercel's Upstash integration injects
 * (KV_REST_API_URL / KV_REST_API_TOKEN) and Upstash's own
 * (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). With neither set,
 * redisConfigured() is false and every caller degrades explicitly.
 */

type Arg = string | number;

function credentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export function redisConfigured(): boolean {
  return credentials() !== null;
}

export class RedisUnavailable extends Error {}

async function call(path: string, body: unknown): Promise<unknown> {
  const creds = credentials();
  if (!creds) throw new RedisUnavailable('redis: not configured');
  const response = await fetch(`${creds.url}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new RedisUnavailable(`redis: HTTP ${response.status}`);
  return response.json();
}

/** One command, e.g. redis(['GET', 'key']). Returns the command's result. */
export async function redis<T = unknown>(command: Arg[]): Promise<T> {
  const payload = (await call('', command)) as { result?: T; error?: string };
  if (payload.error) throw new RedisUnavailable(`redis: ${payload.error}`);
  return payload.result as T;
}

/** Several commands in one round trip, results in order. */
export async function pipeline<T extends unknown[] = unknown[]>(commands: Arg[][]): Promise<T> {
  const payload = (await call('/pipeline', commands)) as { result?: unknown; error?: string }[];
  return payload.map((entry) => {
    if (entry.error) throw new RedisUnavailable(`redis: ${entry.error}`);
    return entry.result;
  }) as T;
}

import { requestJsonRaw } from '../live/http';

/**
 * A minimal Upstash Redis REST client — the store behind rate limiting,
 * alerts, enquiries and price history. No SDK, so nothing new enters the
 * bundle or the dependency tree.
 *
 * It deliberately avoids the framework-patched fetch: pages read price
 * history and provider reliability while rendering, and a no-store fetch
 * there would silently demote statically generated pages to dynamic (the
 * same failure that once turned unknown corridors into 200s).
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
  try {
    return await requestJsonRaw(`${creds.url}${path}`, {
      method: 'POST',
      body,
      headers: { Authorization: `Bearer ${creds.token}` },
      timeoutMs: 5000,
    });
  } catch (error) {
    throw new RedisUnavailable(error instanceof Error ? error.message : 'redis: request failed');
  }
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

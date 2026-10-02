import { unstable_cache } from 'next/cache';

/**
 * A market read shared by every server instance for `seconds`.
 *
 * On Vercel each function instance has its own memory and is recycled
 * constantly, so a module-level Map caches almost nothing in production.
 * The framework's data cache is shared across instances, which is what
 * actually keeps a burst of visitors from fanning out to free upstream
 * APIs. A rejected read is never stored, so failures retry on the next call.
 *
 * The cache serves stale-while-revalidate: past the window it returns the
 * old value and refreshes in the background — and if that refresh keeps
 * failing, it keeps returning the old value. So every read comes back with
 * its age, and callers treat an age beyond isStale() as exactly that: a
 * stale read, which downgrades the quote's confidence instead of passing
 * as current.
 *
 * Outside a Next runtime (unit tests, scripts) the cache does not exist and
 * the read runs directly.
 */
export interface SharedRead<T> {
  value: T;
  /** Milliseconds since this value was fetched from upstream. */
  ageMs: number;
}

export async function sharedCache<T>(
  key: readonly string[],
  seconds: number,
  read: () => Promise<T>,
): Promise<SharedRead<T>> {
  const stamped = async () => ({ at: Date.now(), value: await read() });
  const fresh = async (): Promise<SharedRead<T>> => ({ value: (await stamped()).value, ageMs: 0 });

  let cached: () => Promise<{ at: number; value: T }>;
  try {
    cached = unstable_cache(stamped, ['market', ...key], { revalidate: seconds });
  } catch {
    return fresh();
  }
  try {
    const hit = await cached();
    return { value: hit.value, ageMs: Math.max(0, Date.now() - hit.at) };
  } catch (error) {
    // Distinguish "no incremental cache here" from a genuine upstream
    // failure: only the former falls back to a direct read.
    if (error instanceof Error && /incrementalCache|static generation store/i.test(error.message)) {
      return fresh();
    }
    throw error;
  }
}

/** True when a read is older than its window can explain: background refresh is failing. */
export function isStale(ageMs: number, windowSeconds: number): boolean {
  return ageMs > (windowSeconds * 2 + 30) * 1000;
}

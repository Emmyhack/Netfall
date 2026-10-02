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
 * Outside a Next runtime (unit tests, scripts) the cache does not exist and
 * the read runs directly.
 */
export async function sharedCache<T>(
  key: readonly string[],
  seconds: number,
  read: () => Promise<T>,
): Promise<T> {
  let cached: () => Promise<T>;
  try {
    cached = unstable_cache(read, ['market', ...key], { revalidate: seconds });
  } catch {
    return read();
  }
  try {
    return await cached();
  } catch (error) {
    // Distinguish "no incremental cache here" from a genuine upstream
    // failure: only the former falls back to a direct read.
    if (error instanceof Error && /incrementalCache|static generation store/i.test(error.message)) {
      return read();
    }
    throw error;
  }
}

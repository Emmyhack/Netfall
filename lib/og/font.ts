import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Fonts for the generated share images.
 *
 * Read from disk, never the network. The first version fetched Outfit from
 * Google Fonts at build time, and one flaky route to fonts.googleapis.com
 * failed an entire production build — a build must not depend on someone
 * else's uptime. These are Outfit 500 and 600 subset to the characters the
 * cards can render (printable ASCII plus ·, — and →), vendored under
 * assets/fonts with the OFL licence text beside them. Satori needs raw TTF,
 * which is why they are not woff2 like the wordmark.
 */
const cache = new Map<number, Promise<ArrayBuffer>>();

export function outfitFont(weight: 500 | 600): Promise<ArrayBuffer> {
  const cached = cache.get(weight);
  if (cached) return cached;

  const loading = readFile(
    path.join(process.cwd(), 'assets', 'fonts', `og-outfit-${weight}.ttf`),
  ).then((buffer) =>
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );

  cache.set(weight, loading);
  return loading;
}

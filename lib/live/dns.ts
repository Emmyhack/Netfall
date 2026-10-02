import { lookup as systemLookup, type LookupAddress } from 'node:dns';
import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Hostname resolution for every outbound request, without the libuv
 * threadpool.
 *
 * Node's default dns.lookup runs getaddrinfo on a pool of four threads
 * shared with file I/O. A host whose DNS hangs — measured here with venues
 * blocked at the resolver — holds a thread for the full system timeout, and
 * four of them stall every other lookup in the process: a healthy venue
 * then times out behind an unreachable one. This resolver uses c-ares
 * (network queries, no threads) with a hard per-query timeout, caches
 * answers for their TTL, and remembers failures briefly so a dead host is
 * not re-queried on every request.
 */

type Answer = { address: string; family: 4 | 6 };
type Entry = { answers: Answer[]; until: number } | { error: NodeJS.ErrnoException; until: number };

const MAX_TTL_MS = 5 * 60 * 1000;
const MIN_TTL_MS = 30 * 1000;
const NEGATIVE_TTL_MS = 30 * 1000;

let resolver: Pick<Resolver, 'resolve4' | 'resolve6'> = new Resolver({ timeout: 2500, tries: 2 });
const cache = new Map<string, Entry>();

/** Test seam. */
export function __setResolverForTests(next: Pick<Resolver, 'resolve4' | 'resolve6'>): void {
  resolver = next;
  cache.clear();
}

async function resolveHost(hostname: string): Promise<Answer[]> {
  const now = Date.now();
  const held = cache.get(hostname);
  if (held && held.until > now) {
    if ('error' in held) throw held.error;
    return held.answers;
  }

  const [v4, v6] = await Promise.allSettled([
    resolver.resolve4(hostname, { ttl: true }),
    resolver.resolve6(hostname, { ttl: true }),
  ]);
  const records = [
    ...(v4.status === 'fulfilled' ? v4.value.map((r) => ({ ...r, family: 4 as const })) : []),
    ...(v6.status === 'fulfilled' ? v6.value.map((r) => ({ ...r, family: 6 as const })) : []),
  ];

  if (records.length === 0) {
    const reason = v4.status === 'rejected' ? v4.reason : new Error(`no addresses for ${hostname}`);
    const error = Object.assign(reason instanceof Error ? reason : new Error(String(reason)), {
      code: (reason as NodeJS.ErrnoException)?.code ?? 'ENOTFOUND',
    }) as NodeJS.ErrnoException;
    cache.set(hostname, { error, until: now + NEGATIVE_TTL_MS });
    throw error;
  }

  // IPv4 first: the same AAAA-stall measurement that motivated ipv4first.
  const answers = records.map(({ address, family }) => ({ address, family }));
  const ttlMs = Math.min(MAX_TTL_MS, Math.max(MIN_TTL_MS, Math.min(...records.map((r) => r.ttl)) * 1000));
  cache.set(hostname, { answers, until: now + ttlMs });
  return answers;
}

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

/**
 * Drop-in for the `lookup` option of http(s).request / net.connect. Hosts
 * c-ares cannot answer (localhost, /etc/hosts entries) fall back to the
 * system resolver, which is fast for exactly those names.
 */
export function fastLookup(
  hostname: string,
  options: { family?: number | string; all?: boolean } | number | undefined,
  callback: LookupCallback,
): void {
  const opts = typeof options === 'object' && options !== null ? options : {};
  const literal = isIP(hostname);
  if (literal) {
    if (opts.all) callback(null, [{ address: hostname, family: literal }]);
    else callback(null, hostname, literal);
    return;
  }
  if (hostname === 'localhost' || !hostname.includes('.')) {
    systemLookup(hostname, { all: Boolean(opts.all) } as never, callback as never);
    return;
  }

  const wanted = opts.family === 6 || opts.family === 'IPv6' ? 6 : opts.family === 4 || opts.family === 'IPv4' ? 4 : 0;
  resolveHost(hostname).then(
    (answers) => {
      const usable = wanted ? answers.filter((a) => a.family === wanted) : answers;
      if (usable.length === 0) {
        const error = Object.assign(new Error(`no IPv${wanted} address for ${hostname}`), { code: 'ENOTFOUND' });
        callback(error, opts.all ? [] : '', undefined);
        return;
      }
      if (opts.all) callback(null, usable);
      else callback(null, usable[0]!.address, usable[0]!.family);
    },
    (error: NodeJS.ErrnoException) => callback(error, opts.all ? [] : '', undefined),
  );
}

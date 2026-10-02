import { request as httpsRequest } from 'node:https';
import { setDefaultResultOrder } from 'node:dns';

/*
 * Applied here as well as in instrumentation.ts, because instrumentation is
 * a runtime hook and does not run inside `next build` prerender workers —
 * where these fetches also happen. Without it, hosts that advertise AAAA
 * records stalled ~2s per call on this network before falling back to IPv4,
 * and the build's 60-second page budget drowned in accumulated stalls.
 */
try {
  setDefaultResultOrder('ipv4first');
} catch {
  /* non-Node runtime: the option does not exist and does not matter */
}

/**
 * Server-side fetch for external market data. Every call gets a timeout, a
 * browser user agent (several of these hosts drop bare clients at the CDN),
 * and a cache window so a burst of visitors does not hammer free services.
 *
 * Runs only on the server: connectors and routes import it, the client never
 * does.
 */

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly kind: 'timeout' | 'http' | 'shape',
  ) {
    super(message);
  }
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

/**
 * Last good response per URL. Venue latency was measured swinging from
 * 400ms to 12.6s within a single hour; when a refresh cannot beat the
 * timeout, the last confirmed read — bounded by STALE_MAX_MS — is better
 * than a blank row, provided the staleness is surfaced. Callers that
 * receive a stale read downgrade the quote's confidence to
 * insufficient_data, whose meaning in the UI is precisely "we could not
 * confirm current pricing".
 */
const lastGood = new Map<string, { payload: unknown; at: number }>();
const STALE_MAX_MS = 10 * 60 * 1000;

export interface CachedRead {
  data: unknown;
  /** Milliseconds since the data was confirmed, or null when fresh. */
  staleAgeMs: number | null;
}

export async function fetchJsonCached(
  url: string,
  options: { timeoutMs?: number; revalidateSeconds?: number } = {},
): Promise<CachedRead> {
  try {
    const data = await fetchJson(url, options);
    lastGood.set(url, { payload: data, at: Date.now() });
    return { data, staleAgeMs: null };
  } catch (error) {
    const held = lastGood.get(url);
    if (held && Date.now() - held.at <= STALE_MAX_MS) {
      return { data: held.payload, staleAgeMs: Date.now() - held.at };
    }
    throw error;
  }
}

export async function fetchJson(
  url: string,
  options: {
    timeoutMs?: number;
    revalidateSeconds?: number;
    method?: 'GET' | 'POST';
    body?: unknown;
  } = {},
): Promise<unknown> {
  // 9s, measured rather than guessed: the same venue that answers in 400ms
  // off-peak was observed taking 4.6s minutes later. A slow real answer
  // beats a fabricated absence, and the client fan-out caps the page's own
  // wait at 12s regardless.
  const { timeoutMs = 9000, revalidateSeconds = 30, method = 'GET', body } = options;

  // POST goes over a raw HTTPS request, deliberately. The framework-patched
  // fetch treats any no-store call reached during a page render as dynamic
  // data and silently demotes the whole route out of static generation —
  // which is how every corridor page stopped being prerendered and unknown
  // corridors began answering 200. These POSTs are memoised upstream on the
  // same cadence a cached GET would be, so bypassing the patch keeps the
  // semantics and returns the routes to the build modes they declare.
  if (method === 'POST') {
    return requestJsonRaw(url, { method: 'POST', body, timeoutMs });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: revalidateSeconds },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new UpstreamError(
      `${url}: ${timedOut ? 'timed out' : 'unreachable'}`,
      timedOut ? 'timeout' : 'http',
    );
  }

  if (!response.ok) {
    throw new UpstreamError(`${url}: HTTP ${response.status}`, 'http');
  }

  try {
    return await response.json();
  } catch {
    throw new UpstreamError(`${url}: response was not JSON`, 'shape');
  }
}

/**
 * A request that bypasses the framework-patched fetch (see fetchJson). Used
 * for POSTs and for signed GETs, whose per-request signature would make
 * every call a cache miss and a no-store fetch anyway. Callers that want a
 * cross-instance cache wrap the call in sharedCache().
 */
export function requestJsonRaw(
  url: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {},
): Promise<unknown> {
  const { method = 'GET', body, headers = {}, timeoutMs = 9000 } = options;
  return new Promise((resolve, reject) => {
    const payload = method === 'POST' ? JSON.stringify(body ?? {}) : null;
    const req = httpsRequest(
      url,
      {
        method,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          ...(payload !== null
            ? { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(payload)) }
            : {}),
          ...headers,
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            reject(new UpstreamError(`${url}: HTTP ${status}`, 'http'));
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch {
            reject(new UpstreamError(`${url}: response was not JSON`, 'shape'));
          }
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new UpstreamError(`${url}: timed out`, 'timeout'));
    });
    req.on('error', () => reject(new UpstreamError(`${url}: unreachable`, 'http')));
    if (payload !== null) req.end(payload);
    else req.end();
  });
}

/** Narrowing helper: a finite number from an unknown payload, or null. */
export function numberFrom(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/**
 * The one sanctioned crossing from an upstream JSON number into our decimal
 * strings. Upstream APIs serialise prices as doubles; we take the digits they
 * sent and never do arithmetic on the number form.
 */
export function decimalStringFrom(value: unknown): string | null {
  const parsed = numberFrom(value);
  if (parsed === null || parsed <= 0) return null;
  const text = String(parsed);
  // Reject exponent forms rather than mis-parsing them downstream.
  return /^\d+(\.\d+)?$/.test(text) ? text : parsed.toFixed(12);
}

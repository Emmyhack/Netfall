import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clientIp, rateLimit } from './ratelimit';
import { amountFromParam, corridorFromParam, isApiError } from './publicApi';
import { getCorridor } from '../corridors';

const ENV = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

const req = (ip = '203.0.113.7') => new Request('https://x.test/api', { headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } });

describe('rate limiting', () => {
  it('takes the client address from the first forwarded hop', () => {
    expect(clientIp(req())).toBe('203.0.113.7');
  });

  it('allows everything when no store is configured', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect((await rateLimit(req(), 'b', 1, 60)).allowed).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('blocks once the window count passes the limit', async () => {
    process.env.KV_REST_API_URL = 'https://redis.test';
    process.env.KV_REST_API_TOKEN = 't';
    let count = 0;
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([{ result: ++count }, { result: 1 }])));
    expect((await rateLimit(req(), 'b', 2, 60)).allowed).toBe(true);
    expect((await rateLimit(req(), 'b', 2, 60)).allowed).toBe(true);
    const third = await rateLimit(req(), 'b', 2, 60);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('fails open when the store errors, so an outage never blocks visitors', async () => {
    process.env.KV_REST_API_URL = 'https://redis.test';
    process.env.KV_REST_API_TOKEN = 't';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    expect((await rateLimit(req(), 'b', 1, 60)).allowed).toBe(true);
  });
});

describe('public API parameters', () => {
  const ngn = getCorridor('ngn-usdt')!;

  it('accepts slugs and uppercase ids', () => {
    expect(isApiError(corridorFromParam('NGN-USDT'))).toBe(false);
    expect(isApiError(corridorFromParam('ngn-usdt'))).toBe(false);
    expect(corridorFromParam('zar-usdt')).toMatchObject({ error: 'corridor_unsupported' });
    expect(corridorFromParam(null)).toMatchObject({ error: 'corridor_unsupported' });
  });

  it('bounds the amount to the public range', () => {
    expect(amountFromParam('500000', ngn)).toBe('500000');
    expect(amountFromParam('1e5', ngn)).toMatchObject({ error: 'amount_invalid' });
    expect(amountFromParam(ngn.minAmount, ngn)).toBe(ngn.minAmount);
    expect(amountFromParam('1', ngn)).toMatchObject({ error: 'below_minimum' });
    expect(amountFromParam(ngn.otcThreshold, ngn)).toBe(ngn.otcThreshold);
    expect(amountFromParam(`${ngn.otcThreshold}.01`, ngn)).toMatchObject({ error: 'above_public_range' });
  });
});

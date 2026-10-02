import { describe, expect, it, vi } from 'vitest';
import { __setResolverForTests, fastLookup } from './dns';
import { isStale, sharedCache } from './shared';

const lookup = (host: string, options: object) =>
  new Promise<{ err: NodeJS.ErrnoException | null; address: unknown; family?: number }>((resolve) =>
    fastLookup(host, options, (err, address, family) => resolve({ err, address, family })),
  );

describe('fastLookup', () => {
  it('passes IP literals straight through, in both callback shapes', async () => {
    expect(await lookup('203.0.113.9', {})).toMatchObject({ err: null, address: '203.0.113.9', family: 4 });
    expect(await lookup('::1', { all: true })).toMatchObject({ err: null, address: [{ address: '::1', family: 6 }] });
  });

  it('prefers IPv4 and honours an explicit family', async () => {
    __setResolverForTests({
      resolve4: vi.fn(async () => [{ address: '198.51.100.1', ttl: 60 }]),
      resolve6: vi.fn(async () => [{ address: '2001:db8::1', ttl: 60 }]),
    } as never);
    expect(await lookup('venue.example', {})).toMatchObject({ address: '198.51.100.1', family: 4 });
    expect(await lookup('venue.example', { family: 6 })).toMatchObject({ address: '2001:db8::1', family: 6 });
    const all = await lookup('venue.example', { all: true });
    expect(all.address).toEqual([
      { address: '198.51.100.1', family: 4 },
      { address: '2001:db8::1', family: 6 },
    ]);
  });

  it('caches answers instead of querying on every request', async () => {
    const resolve4 = vi.fn(async () => [{ address: '198.51.100.2', ttl: 300 }]);
    __setResolverForTests({ resolve4, resolve6: vi.fn(async () => []) } as never);
    await lookup('cached.example', {});
    await lookup('cached.example', {});
    expect(resolve4).toHaveBeenCalledTimes(1);
  });

  it('remembers a failing host briefly, so a dead venue is not re-queried per request', async () => {
    const fail = Object.assign(new Error('timeout'), { code: 'ETIMEOUT' });
    const resolve4 = vi.fn(async () => Promise.reject(fail));
    __setResolverForTests({ resolve4, resolve6: vi.fn(async () => Promise.reject(fail)) } as never);
    const first = await lookup('dead.example', {});
    const second = await lookup('dead.example', {});
    expect(first.err?.code).toBe('ETIMEOUT');
    expect(second.err?.code).toBe('ETIMEOUT');
    expect(resolve4).toHaveBeenCalledTimes(1);
  });
});

describe('shared market reads', () => {
  it('runs the read directly outside a Next runtime and reports it as fresh', async () => {
    const read = await sharedCache(['test', 'direct'], 30, async () => 42);
    expect(read).toEqual({ value: 42, ageMs: 0 });
  });

  it('calls a read stale only when its age outruns the refresh window', () => {
    expect(isStale(0, 30)).toBe(false);
    expect(isStale(89_000, 30)).toBe(false);
    expect(isStale(91_000, 30)).toBe(true);
  });
});

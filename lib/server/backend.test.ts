import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-ins for Redis and the email sender.
const store = vi.hoisted(() => {
  const kv = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const lists = new Map<string, string[]>();
  const exec = (cmd: (string | number)[]): unknown => {
    const [op, key, ...rest] = cmd.map(String) as [string, string, ...string[]];
    switch (op) {
      case 'GET': return kv.get(key) ?? null;
      case 'SET': kv.set(key, rest[0]!); return 'OK';
      case 'DEL': kv.delete(key); return 1;
      case 'EXISTS': return kv.has(key) ? 1 : 0;
      case 'SADD': { const s = sets.get(key) ?? new Set(); rest.forEach((m) => s.add(m)); sets.set(key, s); return 1; }
      case 'SREM': { rest.forEach((m) => sets.get(key)?.delete(m)); return 1; }
      case 'SMEMBERS': return [...(sets.get(key) ?? [])];
      case 'LPUSH': { const l = lists.get(key) ?? []; l.unshift(rest[0]!); lists.set(key, l); return l.length; }
      case 'LTRIM': { const l = lists.get(key) ?? []; lists.set(key, l.slice(Number(rest[0]), Number(rest[1]) + 1)); return 'OK'; }
      case 'LRANGE': return (lists.get(key) ?? []).slice(Number(rest[0]), Number(rest[1]) + 1);
      default: throw new Error(`unmocked ${op}`);
    }
  };
  return { kv, sets, lists, exec, sent: [] as { to: string; subject: string; text: string; unsubscribeUrl?: string }[] };
});

vi.mock('./redis', () => ({
  redisConfigured: () => true,
  redis: async (cmd: (string | number)[]) => store.exec(cmd),
  pipeline: async (cmds: (string | number)[][]) => cmds.map(store.exec),
}));
vi.mock('./email', async (original) => ({
  ...(await original<typeof import('./email')>()),
  emailConfigured: () => true,
  sendEmail: async (email: { to: string; subject: string; text: string; unsubscribeUrl?: string }) => {
    store.sent.push(email);
  },
}));

import { confirmAlert, createAlert, evaluateAlerts, validateAlertInput, type StoredAlert } from './alerts';
import { validateEnquiry } from './enquiries';
import { cronAuthorised } from './features';
import { readHistory, recordTick } from './history';
import type { CorridorSnapshot } from './snapshot';
import { issueToken, verifyToken } from './tokens';
import { getCorridor } from '../corridors';

const SECRET = 'x'.repeat(40);

beforeEach(() => {
  process.env.ALERTS_TOKEN_SECRET = SECRET;
  process.env.CRON_SECRET = 'cron-secret-1234567890';
  store.kv.clear();
  store.sets.clear();
  store.lists.clear();
  store.sent.length = 0;
});
afterEach(() => {
  delete process.env.ALERTS_TOKEN_SECRET;
  delete process.env.CRON_SECRET;
  vi.useRealTimers();
});

describe('email link tokens', () => {
  it('round-trips the id for the right action only', () => {
    const token = issueToken('confirm', 'abc', 60);
    expect(verifyToken(token, 'confirm')).toBe('abc');
    expect(verifyToken(token, 'unsubscribe')).toBeNull();
  });

  it('rejects a tampered payload and a forged signature', () => {
    const token = issueToken('unsubscribe', 'abc', 60);
    const [payload, sig] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ a: 'unsubscribe', i: 'someone-else', e: 9e9 })).toString('base64url');
    expect(verifyToken(`${forgedPayload}.${sig}`, 'unsubscribe')).toBeNull();
    expect(verifyToken(`${payload}.AAAA`, 'unsubscribe')).toBeNull();
    expect(verifyToken('garbage', 'unsubscribe')).toBeNull();
    expect(verifyToken(undefined, 'unsubscribe')).toBeNull();
  });

  it('expires', () => {
    vi.useFakeTimers();
    const token = issueToken('confirm', 'abc', 60);
    vi.advanceTimersByTime(61_000);
    expect(verifyToken(token, 'confirm')).toBeNull();
  });

  it('treats every link as invalid when no secret is configured', () => {
    const token = issueToken('confirm', 'abc', 60);
    delete process.env.ALERTS_TOKEN_SECRET;
    expect(verifyToken(token, 'confirm')).toBeNull();
  });

  it('invalidates every link when the secret changes', () => {
    const token = issueToken('confirm', 'abc', 60);
    process.env.ALERTS_TOKEN_SECRET = 'y'.repeat(40);
    expect(verifyToken(token, 'confirm')).toBeNull();
  });
});

describe('alert input validation', () => {
  it('accepts both trigger kinds and rejects junk', () => {
    expect(validateAlertInput({ corridor: 'ngn-usdt', email: 'a@b.co', trigger: { kind: 'best_provider_changes' } }).ok).toBe(true);
    expect(validateAlertInput({ corridor: 'ngn-usdt', email: 'a@b.co', trigger: { kind: 'target_rate', targetRate: '1500' } }).ok).toBe(true);
    expect(validateAlertInput({ corridor: 'zar-usdt', email: 'a@b.co', trigger: { kind: 'best_provider_changes' } }).ok).toBe(false);
    expect(validateAlertInput({ corridor: 'ngn-usdt', email: 'nope', trigger: { kind: 'best_provider_changes' } }).ok).toBe(false);
    expect(validateAlertInput({ corridor: 'ngn-usdt', email: 'a@b.co', trigger: { kind: 'target_rate', targetRate: '-1' } }).ok).toBe(false);
    expect(validateAlertInput({ corridor: 'ngn-usdt', email: 'a@b.co', trigger: { kind: 'whatever' } }).ok).toBe(false);
    expect(validateAlertInput(null).ok).toBe(false);
  });
});

const ngn = getCorridor('ngn-usdt')!;
const snap = (over: Partial<CorridorSnapshot> = {}): CorridorSnapshot => ({
  corridor: 'ngn-usdt',
  at: new Date().toISOString(),
  amount: '500000',
  provider: 'quidax',
  providerName: 'Quidax',
  landed: '364.00',
  fiatPerAsset: '1373.6264',
  ...over,
});

async function activeAlert(trigger: StoredAlert['trigger']): Promise<string> {
  const created = await createAlert({ corridor: ngn, trigger, email: 'person@example.com' });
  expect(created.ok).toBe(true);
  const confirmEmail = store.sent.pop()!;
  const token = /token=([^\s]+)/.exec(confirmEmail.text)![1]!;
  const id = verifyToken(token, 'confirm')!;
  expect(await confirmAlert(id)).toBe('confirmed');
  return id;
}

describe('alert lifecycle', () => {
  it('sends a confirmation and watches nothing until confirmed', async () => {
    await createAlert({ corridor: ngn, trigger: { kind: 'best_provider_changes' }, email: 'p@example.com' });
    expect(store.sent).toHaveLength(1);
    expect(store.sent[0]!.subject).toMatch(/Confirm/);
    expect(store.sets.get('alerts:active')?.size ?? 0).toBe(0);
  });

  it('fires a target-rate alert once, at or below target, then deletes it', async () => {
    const id = await activeAlert({ kind: 'target_rate', targetRate: '1370' });

    await evaluateAlerts(new Map([['ngn-usdt', snap({ fiatPerAsset: '1373.6264' })]]));
    expect(store.sent).toHaveLength(0);

    const report = await evaluateAlerts(new Map([['ngn-usdt', snap({ fiatPerAsset: '1370' })]]));
    expect(report.sent).toBe(1);
    expect(store.sent[0]!.subject).toMatch(/hit your rate/);
    expect(store.kv.has(`alert:${id}`)).toBe(false);

    await evaluateAlerts(new Map([['ngn-usdt', snap({ fiatPerAsset: '1300' })]]));
    expect(store.sent).toHaveLength(1);
  });

  it('baselines the cheapest provider silently, then reports a change with one-click unsubscribe', async () => {
    await activeAlert({ kind: 'best_provider_changes' });
    await evaluateAlerts(new Map([['ngn-usdt', snap()]]));
    expect(store.sent).toHaveLength(0);

    await evaluateAlerts(new Map([['ngn-usdt', snap({ provider: 'luno', providerName: 'Luno' })]]));
    expect(store.sent).toHaveLength(1);
    expect(store.sent[0]!.subject).toMatch(/Luno is now cheapest/);
    expect(store.sent[0]!.unsubscribeUrl).toMatch(/\/api\/v1\/alerts\/unsubscribe\?token=/);
  });

  it('holds further change emails for six hours', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await activeAlert({ kind: 'best_provider_changes' });
    await evaluateAlerts(new Map([['ngn-usdt', snap()]]));
    await evaluateAlerts(new Map([['ngn-usdt', snap({ provider: 'luno', providerName: 'Luno' })]]));
    await evaluateAlerts(new Map([['ngn-usdt', snap({ provider: 'quidax' })]]));
    expect(store.sent).toHaveLength(1);
    vi.advanceTimersByTime(6 * 3600 * 1000 + 1);
    await evaluateAlerts(new Map([['ngn-usdt', snap({ provider: 'quidax' })]]));
    expect(store.sent).toHaveLength(2);
  });

  it('skips a corridor with no usable snapshot instead of guessing', async () => {
    await activeAlert({ kind: 'target_rate', targetRate: '99999' });
    const report = await evaluateAlerts(new Map());
    expect(report).toEqual({ checked: 0, sent: 0, failed: 0 });
  });

  it('caps alerts per address', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await createAlert({ corridor: ngn, trigger: { kind: 'best_provider_changes' }, email: 'cap@example.com' })).ok).toBe(true);
    }
    const eleventh = await createAlert({ corridor: ngn, trigger: { kind: 'best_provider_changes' }, email: 'CAP@example.com' });
    expect(eleventh).toMatchObject({ ok: false, error: 'too_many_alerts' });
  });
});

describe('enquiry validation', () => {
  const base = {
    corridor: 'ngn-usdt',
    amount: '80000000',
    frequency: 'monthly',
    settlementWindow: 'next_day',
    entityType: 'business',
    contactChannel: 'email',
    contactDestination: 'treasury@example.com',
    notes: 'x'.repeat(5000),
  };
  it('accepts a complete enquiry and caps notes', () => {
    const result = validateEnquiry(base);
    expect(result.ok && result.value.notes.length).toBe(2000);
  });
  it('rejects bad channels, contacts and enums', () => {
    expect(validateEnquiry({ ...base, contactChannel: 'sms' }).ok).toBe(false);
    expect(validateEnquiry({ ...base, contactDestination: 'nope' }).ok).toBe(false);
    expect(validateEnquiry({ ...base, contactChannel: 'whatsapp', contactDestination: '+234 802 000 0000' }).ok).toBe(true);
    expect(validateEnquiry({ ...base, frequency: 'hourly' }).ok).toBe(false);
    expect(validateEnquiry({ ...base, amount: '1' }).ok).toBe(false);
  });
});

describe('cron authorisation', () => {
  const call = (auth?: string) => new Request('https://x.test/api/cron/tick', auth ? { headers: { authorization: auth } } : {});
  it('accepts only the exact bearer secret', () => {
    expect(cronAuthorised(call('Bearer cron-secret-1234567890'))).toBe(true);
    expect(cronAuthorised(call('Bearer wrong'))).toBe(false);
    expect(cronAuthorised(call())).toBe(false);
  });
  it('refuses everything when no secret is configured', () => {
    delete process.env.CRON_SECRET;
    expect(cronAuthorised(call('Bearer '))).toBe(false);
  });
});

describe('rate history', () => {
  it('records snapshots and reads them back oldest first', async () => {
    const now = Date.now();
    await recordTick(new Map([['ngn-usdt', snap({ at: new Date(now - 60_000).toISOString(), fiatPerAsset: '1380' })]]), new Map());
    await recordTick(new Map([['ngn-usdt', snap({ at: new Date(now).toISOString(), fiatPerAsset: '1375' })]]), new Map());
    const points = await readHistory('ngn-usdt');
    expect(points.map((p) => p.r)).toEqual(['1380', '1375']);
  });
});

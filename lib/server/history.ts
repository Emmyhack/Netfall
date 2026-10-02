import { CORRIDORS } from '../corridors';
import { isLive } from '../live/configured';
import { LIVE_PROVIDERS } from '../live/registry';
import type { QuoteResponse } from '../types';
import { pipeline, redisConfigured } from './redis';
import type { CorridorSnapshot } from './snapshot';

/**
 * What the scheduled tick remembers: each corridor's best usable rate, and
 * whether each live provider answered. Both are capped lists, newest first,
 * so storage is bounded no matter how long the site runs.
 *
 * At one tick every 15 minutes: 1,344 points is 14 days of rate history and
 * 672 is 7 days of reliability.
 */

const HISTORY_POINTS = 1344;
const RELIABILITY_POINTS = 672;

const historyKey = (corridor: string) => `hist:${corridor}`;
const reliabilityKey = (provider: string, corridor: string) => `rel:${provider}:${corridor}`;

export interface HistoryPoint {
  /** Epoch milliseconds. */
  t: number;
  /** Fiat per one unit of the asset at the best usable quote. */
  r: string;
  /** Provider slug that held the best price. */
  p: string;
}

export async function recordTick(
  snapshots: ReadonlyMap<string, CorridorSnapshot>,
  responses: ReadonlyMap<string, QuoteResponse>,
): Promise<void> {
  const commands: (string | number)[][] = [];

  for (const snap of snapshots.values()) {
    const point: HistoryPoint = { t: Date.parse(snap.at), r: snap.fiatPerAsset, p: snap.provider };
    commands.push(['LPUSH', historyKey(snap.corridor), JSON.stringify(point)]);
    commands.push(['LTRIM', historyKey(snap.corridor), 0, HISTORY_POINTS - 1]);
  }

  // Reliability counts only providers that are supposed to answer here: a
  // provider without an integration is not "down", it is not built.
  for (const [corridor, response] of responses) {
    const answered = new Set(response.quotes.map((q) => q.provider));
    for (const provider of LIVE_PROVIDERS) {
      if (!isLive(provider.slug) || !(provider.corridors as readonly string[]).includes(corridor)) continue;
      const key = reliabilityKey(provider.slug, corridor);
      commands.push(['LPUSH', key, answered.has(provider.slug) ? 1 : 0]);
      commands.push(['LTRIM', key, 0, RELIABILITY_POINTS - 1]);
    }
  }

  if (commands.length > 0) await pipeline(commands);
}

/** Up to 7 days of points for a corridor, oldest first. Empty when nothing is recorded. */
export async function readHistory(corridor: string, days = 7): Promise<HistoryPoint[]> {
  if (!redisConfigured()) return [];
  try {
    const [rows] = await pipeline<[string[]]>([['LRANGE', historyKey(corridor), 0, HISTORY_POINTS - 1]]);
    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    return rows
      .map((row) => JSON.parse(row) as HistoryPoint)
      .filter((point) => point.t >= cutoff)
      .reverse();
  } catch {
    return [];
  }
}

export interface Reliability {
  answered: number;
  checks: number;
}

/** Per provider, per corridor: answered checks out of recorded checks over the last 7 days. */
export async function readReliability(): Promise<Map<string, Map<string, Reliability>>> {
  const result = new Map<string, Map<string, Reliability>>();
  if (!redisConfigured()) return result;

  const pairs: { provider: string; corridor: string }[] = [];
  for (const provider of LIVE_PROVIDERS) {
    for (const c of CORRIDORS) {
      if ((provider.corridors as readonly string[]).includes(c.slug)) {
        pairs.push({ provider: provider.slug, corridor: c.slug });
      }
    }
  }
  try {
    const rows = await pipeline<string[][]>(
      pairs.map(({ provider, corridor }) => ['LRANGE', reliabilityKey(provider, corridor), 0, RELIABILITY_POINTS - 1]),
    );
    pairs.forEach(({ provider, corridor }, index) => {
      const list = rows[index] ?? [];
      if (list.length === 0) return;
      const answered = list.filter((v) => String(v) === '1').length;
      if (!result.has(provider)) result.set(provider, new Map());
      result.get(provider)!.set(corridor, { answered, checks: list.length });
    });
  } catch {
    /* no reliability shown beats a wrong one */
  }
  return result;
}

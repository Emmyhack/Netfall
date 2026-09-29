import { getCorridor } from '../corridors';
import { buildPlan, resolvePlan } from './engine';
import type { CorridorMeta, QuoteResponse, ScenarioId } from '../types';

/**
 * Fixed, seeded responses for the development harnesses and for tests. Same
 * engine as the running app, resolved with no latency.
 */
export function fixtureResponse(
  corridorSlug: string,
  amount: string,
  seed = 'fixture',
  scenario: ScenarioId = 'default',
): QuoteResponse | null {
  const planned = buildPlan({ corridor: corridorSlug, amount, seed, scenario });
  if (!planned.ok) return null;
  return resolvePlan(planned.plan);
}

export function fixtureCorridor(slug = 'ngn-usdt'): CorridorMeta {
  const corridor = getCorridor(slug);
  if (!corridor) throw new Error(`Unknown fixture corridor: ${slug}`);
  return corridor;
}

export const SCENARIO_LABELS: Readonly<Record<ScenarioId, string>> = {
  default: 'Default — a normal, partly degraded market',
  'all-fail': 'All fail — every provider is down',
  'all-timeout': 'All timeout — nothing came back in time',
  'single-provider': 'Single provider — nothing to compare against',
  'zero-dispersion': 'Zero dispersion — every provider lands the same amount',
  'extreme-dispersion': 'Extreme dispersion — the spread is enormous',
  expired: 'Expired — the quote is already stale',
};

export const SCENARIO_IDS = Object.keys(SCENARIO_LABELS) as ScenarioId[];

import { CORRIDORS } from './corridors';
import { aggregate } from './live/aggregate';
import { isLive } from './live/configured';
import { LIVE_PROVIDERS } from './live/registry';
import type { UnavailableReason } from './types';

export type ProbeOutcome = { ok: true } | { ok: false; reason: UnavailableReason | 'no_response' };

export interface ProviderStatus {
  slug: string;
  name: string;
  live: boolean;
  /** Corridor slug -> what happened when we asked, at the default amount. */
  corridors: Record<string, ProbeOutcome>;
}

export interface StatusReport {
  checkedAt: string;
  providers: ProviderStatus[];
}

/**
 * Asks every corridor for a real quote at its default amount and records,
 * per provider, whether it answered. Nothing here is remembered between
 * runs: it is a single honest snapshot, re-taken on the page's cadence.
 */
export async function computeStatus(): Promise<StatusReport> {
  const responses = await Promise.all(
    CORRIDORS.map(async (corridor) => ({
      slug: corridor.slug,
      response: await aggregate(corridor.slug, corridor.defaultAmount).catch(() => null),
    })),
  );

  const providers: ProviderStatus[] = LIVE_PROVIDERS.map((provider) => {
    const corridors: Record<string, ProbeOutcome> = {};
    for (const { slug, response } of responses) {
      if (!(provider.corridors as readonly string[]).includes(slug)) continue;
      if (!response) {
        corridors[slug] = { ok: false, reason: 'no_response' };
        continue;
      }
      if (response.quotes.some((q) => q.provider === provider.slug)) {
        corridors[slug] = { ok: true };
        continue;
      }
      const missing = response.unavailable.find((u) => u.provider === provider.slug);
      corridors[slug] = { ok: false, reason: missing?.reason ?? 'no_response' };
    }
    return { slug: provider.slug, name: provider.name, live: isLive(provider.slug), corridors };
  });

  return { checkedAt: new Date().toISOString(), providers };
}

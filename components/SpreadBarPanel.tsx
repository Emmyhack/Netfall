'use client';

import { formatBps, formatMoney } from '@/lib/format';
import type { CorridorMeta, Quote } from '@/lib/types';
import { SpreadBar } from './SpreadBar';

/**
 * The spread bar at full page width, between the hero and the ranked table.
 *
 * §5.2 asks for the full bar in the hero and on every corridor page, with the
 * compact form above the results. It had been reduced to a 62px line inside a
 * narrow card, which is not the one element allowed to be visually assertive.
 * Given the page's width it can carry the argument on its own.
 */
export function SpreadBarPanel({
  quotes,
  corridor,
  inputAmount,
  dispersionBps,
  settled,
  expectedProviders,
}: {
  quotes: readonly Quote[];
  corridor: CorridorMeta;
  inputAmount: string;
  dispersionBps: number;
  settled: boolean;
  expectedProviders: number;
}) {
  // Settled with nothing to plot: the error surface below says everything
  // there is to say, and an empty axis this size would be a hole in the page.
  if (settled && quotes.length === 0) return null;

  const best = quotes[0];
  const pending = quotes.length === 0;

  return (
    <section aria-labelledby="spread-heading" className="border-b border-rule">
      <div className="mx-auto max-w-page px-5 py-16 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
          <h2 id="spread-heading" className="text-2xl text-ink">
            What the same {formatMoney(inputAmount, corridor.from, { decimals: 0 })} is worth
            across {pending ? expectedProviders : quotes.length} providers
          </h2>
          <p className="text-ink-2">
            {pending ? (
              <span className="text-ink-3">measuring the spread</span>
            ) : (
              <>
                <span className="numeric">{formatBps(dispersionBps)}</span> between best and worst
              </>
            )}
          </p>
        </div>

        <SpreadBar
          className="mt-10"
          variant="full"
          quotes={quotes}
          assetCurrency={corridor.to}
          fiatCurrency={corridor.from}
          bestEffectiveRate={best?.effectiveRate}
          animate={settled}
        />
      </div>
    </section>
  );
}

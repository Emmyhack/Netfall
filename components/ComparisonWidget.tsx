'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { formatMoney } from '@/lib/format';
import { greaterThan } from '@/lib/money';
import { providersFor } from '@/lib/live/registry-core';
import { useComparisonState } from '@/lib/hooks/useComparisonState';
import { useQuotes } from '@/lib/hooks/useQuotes';
import type { CorridorMeta } from '@/lib/types';
import { ApproximationSign, ConfidenceMarker } from './ConfidenceMarker';
import { CorridorSelector } from './CorridorSelector';
import { QuoteTable } from './QuoteTable';
import { SpreadBar } from './SpreadBar';
import { SpreadBarPanel } from './SpreadBarPanel';

/** Only reached above a corridor's OTC threshold, so it is split out. */
const HighTicketInterceptor = dynamic(
  () => import('./HighTicketInterceptor').then((m) => m.HighTicketInterceptor),
  { ssr: false, loading: () => <div className="h-96" aria-hidden="true" /> },
);

export interface ComparisonWidgetProps {
  /** On a corridor page the corridor comes from the route segment. */
  corridorFromPath?: CorridorMeta;
  mode: 'path' | 'query';
  /** Rendered in the left column of the hero, beside the quote card. */
  heroSlot?: React.ReactNode;
}

/** Reserves the headline figure's space so nothing shifts when it resolves. */
const HERO_FIGURE_HEIGHT = 108;

/**
 * Owns the comparison and lays out the two surfaces it needs.
 *
 * The hero card is a quote widget — amount, the headline figure, the spread
 * bar — the way Onramper's hero carries a widget rather than a data table.
 * The ranked table follows at full page width, because six columns of figures
 * do not belong in a half-width card and became unreadable when they were put
 * in one.
 */
export function ComparisonWidget({ corridorFromPath, mode, heroSlot }: ComparisonWidgetProps) {
  const state = useComparisonState({ corridorFromPath, mode });
  const { corridor, amount, amountInput } = state;

  const overThreshold = useMemo(
    () => amount !== null && greaterThan(amount, corridor.otcThreshold),
    [amount, corridor.otcThreshold],
  );

  const quotes = useQuotes({
    corridor: corridor.slug,
    amount,
    seed: state.seed,
    scenario: state.scenario,
    enabled: !overThreshold && state.ready,
  });

  const best = quotes.quotes[0];
  const nothingLanded = quotes.status === 'settled' && quotes.quotes.length === 0;

  return (
    <>
      <section className="sec-paper">
        <div className="mx-auto max-w-page px-5 pb-20 pt-16 sm:px-8 lg:pb-24">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16">
            <div>{heroSlot}</div>

            <div className="rounded-card border border-rule bg-surface shadow-[0_1px_2px_rgba(21,21,21,0.04),0_12px_32px_-12px_rgba(21,21,21,0.12)]">
              <div className="border-b border-rule p-6">
                <CorridorSelector
                  corridor={corridor}
                  amountInput={amountInput}
                  onAmountChange={state.setAmountInput}
                  onCorridorChange={state.setCorridor}
                />
              </div>

              {overThreshold && amount !== null ? (
                <div className="p-6">
                  <p className="text-lg font-medium text-ink">
                    {formatMoney(amount, corridor.from, { decimals: 0 })} is above the rate board
                  </p>
                  <p className="mt-2 text-ink-2">
                    At this size the price is negotiated. The enquiry form is below.
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-sm font-medium text-ink-2">Most you can receive</p>

                  <div style={{ minHeight: HERO_FIGURE_HEIGHT }}>
                    {best ? (
                      <>
                        <p className="numeric mt-2 text-3xl font-semibold text-best">
                          <ApproximationSign confidence={best.confidence} />
                          {formatMoney(best.landedAmount, corridor.to, { showCode: false })}
                          <span className="ml-2 font-sans text-lg font-normal text-ink-2">
                            {corridor.to}
                          </span>
                        </p>
                        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
                          <span>with {best.providerName}</span>
                          <ConfidenceMarker confidence={best.confidence} />
                        </p>
                      </>
                    ) : (
                      <p
                        className="numeric mt-2 text-3xl font-semibold text-ink-3"
                        aria-hidden="true"
                      >
                        {nothingLanded ? '—' : '    '}
                      </p>
                    )}
                  </div>

                  <SpreadBar
                    className="mt-6 border-t border-rule pt-6"
                    variant="compact"
                    quotes={quotes.quotes}
                    assetCurrency={corridor.to}
                    fiatCurrency={corridor.from}
                    bestEffectiveRate={best?.effectiveRate}
                    animate={quotes.status === 'settled'}
                  />

                  <a
                    href="#results"
                    className="mt-6 inline-flex text-sm font-medium text-ink underline underline-offset-4"
                  >
                    See all {providersFor(corridor.slug).length} providers compared
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {!overThreshold && (
        <SpreadBarPanel
          quotes={quotes.quotes}
          corridor={corridor}
          inputAmount={amount ?? corridor.defaultAmount}
          dispersionBps={quotes.dispersionBps}
          settled={quotes.status === 'settled'}
          expectedProviders={providersFor(corridor.slug).length}
        />
      )}

      <div id="results" className="sec-white">
        <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
        {overThreshold && amount !== null ? (
          <HighTicketInterceptor corridor={corridor} amount={amount} />
        ) : (
          <QuoteTable
            state={quotes}
            corridor={corridor}
            inputAmount={amount ?? corridor.defaultAmount}
            showSpreadBar
            expectedProviders={providersFor(corridor.slug).length}
          />
        )}
        </div>
      </div>
    </>
  );
}

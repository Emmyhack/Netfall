'use client';

import { useMemo } from 'react';
import { formatBps, formatCountdown, formatMoney } from '@/lib/format';
import { shortfalls } from '@/lib/quotes/ranking';
import type { CorridorMeta } from '@/lib/types';
import type { QuoteState } from '@/lib/hooks/useQuotes';
import { DisclosureNotice } from './DisclosureNotice';
import { QuoteRow } from './QuoteRow';
import { SavingsCallout } from './SavingsCallout';
import { SourceLabel } from './SourceLabel';
import { SpreadBar } from './SpreadBar';
import { UnavailableList } from './UnavailableList';
import { QUOTE_CONTAINER, QUOTE_HEAD } from './quoteGrid';
import { QuoteError } from './states/QuoteError';
import { QuoteExpired } from './states/QuoteExpired';
import { QuoteTableSkeleton } from './states/QuoteTableSkeleton';

export interface QuoteTableProps {
  state: QuoteState;
  corridor: CorridorMeta;
  inputAmount: string;
  /** Hide the spread bar when the page already shows one above. */
  showSpreadBar?: boolean;
  /**
   * How many providers serve this corridor. Used to reserve skeleton rows
   * before the stream has reported what it is waiting on, so the table is
   * full height from the first paint and nothing shifts.
   */
  expectedProviders?: number;
}

export function QuoteTable({
  state,
  corridor,
  inputAmount,
  showSpreadBar = true,
  expectedProviders = 0,
}: QuoteTableProps) {
  const { quotes, unavailable, status, expired } = state;
  const gaps = useMemo(() => shortfalls(quotes), [quotes]);

  // Columns exist only when at least one quote actually carries the data.
  // The live path states nothing it cannot back; the mock states everything.
  const showSettlement = quotes.some((q) => q.settlementEstimateSeconds !== undefined);
  const showSuccessRate = quotes.some((q) => q.successRate30d !== undefined);
  const midTemplate = [
    showSettlement ? 'minmax(0, 0.8fr)' : '',
    showSuccessRate ? 'minmax(0, 0.7fr)' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const expected = Math.max(state.expected, expectedProviders);
  const pending = Math.max(0, expected - state.received);
  const loading = status === 'idle' || status === 'loading' || status === 'partial';
  const countdown = state.msRemaining === null ? null : formatCountdown(state.msRemaining);

  if (status === 'error' && state.error) {
    // An unsupported corridor is caught by the route before it reaches here,
    // so every error that arrives at this point is a quoting failure.
    return <QuoteError error={state.error} onRetry={state.refresh} />;
  }

  const nothingLanded = status === 'settled' && quotes.length === 0;

  return (
    <div className="space-y-6">
      {/* Rule §4.5 — stated at the point of comparison, every time. */}
      <DisclosureNotice />

      {showSpreadBar && quotes.length > 0 && (
        <SpreadBar
          variant="compact"
          quotes={quotes}
          assetCurrency={corridor.to}
          fiatCurrency={corridor.from}
          bestEffectiveRate={quotes[0]?.effectiveRate}
          animate={status === 'settled'}
        />
      )}

      {expired && state.generatedAt && (
        <QuoteExpired generatedAt={state.generatedAt} onRefresh={state.refresh} />
      )}

      {nothingLanded ? (
        <QuoteError
          error={{
            code: 'all_providers_failed',
            message: `None of the ${unavailable.length} providers serving ${corridor.from} to ${corridor.to} returned a price for this amount.`,
          }}
          onRetry={state.refresh}
        />
      ) : (
        <section
          aria-labelledby="results-heading"
          className={`${QUOTE_CONTAINER} overflow-hidden rounded-card border border-rule bg-surface`}
          style={{ '--qmid': midTemplate || ' ' } as React.CSSProperties}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-5 py-4">
            <h2 id="results-heading" className="text-xl text-ink">
              {quotes.length > 0
                ? `${quotes.length} ${quotes.length === 1 ? 'provider' : 'providers'} ranked by what lands`
                : 'Getting prices'}
            </h2>
            <p className="numeric text-xs text-ink-3">
              {countdown ? `Valid for ${countdown}` : expired ? 'Expired' : ''}
            </p>
          </div>

          {/* Column labels. Rows carry their own accessible labels, so this is
              decoration for sighted users and hidden from assistive tech. */}
          <div
            aria-hidden="true"
            className={`${QUOTE_HEAD} sticky top-0 z-10 border-b border-rule bg-surface-2`}
          >
            <span className="text-xs font-medium text-ink-3">Provider</span>
            <span className="text-xs font-medium text-ink-3">Rate</span>
            {showSettlement && (
              <span className="text-xs font-medium text-ink-3">Settles in</span>
            )}
            {showSuccessRate && (
              <span className="text-xs font-medium text-ink-3">Completed 30d</span>
            )}
            <span className="text-right text-xs font-medium text-ink-3">
              What you&rsquo;ll receive
            </span>
            <span />
          </div>

          <ol>
            {quotes.map((quote, index) => (
              <QuoteRow
                key={quote.provider}
                quote={quote}
                rank={index + 1}
                isBest={index === 0}
                inputAmount={inputAmount}
                fromCurrency={corridor.from}
                toCurrency={corridor.to}
                shortfall={gaps[index] ?? null}
                expired={expired}
                showSettlement={showSettlement}
                showSuccessRate={showSuccessRate}
              />
            ))}
          </ol>

          {/* One skeleton per provider still outstanding, uncapped, so rows and
              skeletons always total the same number and nothing shifts. */}
          {loading && pending > 0 && (
            <QuoteTableSkeleton
              rows={pending}
              showSettlement={showSettlement}
              showSuccessRate={showSuccessRate}
            />
          )}

          <div className="border-t border-rule px-5 py-4">
            <p className="text-xs text-ink-3">
              Ranked by the amount that actually lands, and by nothing else. Figures marked{' '}
              <span aria-hidden="true">{'≈'}</span> are estimates.{' '}
              <SourceLabel source="aggregator" /> means the price came through an aggregator rather
              than the provider directly.
            </p>
          </div>
        </section>
      )}

      {/* The live region. Announcing every row would be hostile, so this is a
          single running summary that screen readers can follow. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {statusAnnouncement(state, corridor, loading, pending, expected)}
      </p>

      {quotes.length > 1 && (
        <SavingsCallout
          quotes={quotes}
          fromCurrency={corridor.from}
          toCurrency={corridor.to}
          dispersionBps={state.dispersionBps}
        />
      )}

      <UnavailableList entries={unavailable} corridor={corridor} />
    </div>
  );
}

function statusAnnouncement(
  state: QuoteState,
  corridor: CorridorMeta,
  loading: boolean,
  pending: number,
  expected: number,
): string {
  if (state.status === 'idle') return '';
  if (state.status === 'error') return state.error?.message ?? 'Could not get prices.';
  if (state.expired) return 'These prices have expired. Refresh to see current prices.';

  if (loading) {
    return `Getting prices. ${state.received} of ${expected} providers have answered, ${pending} still waiting.`;
  }

  const best = state.quotes[0];
  if (!best) return 'No provider returned a price for this amount.';

  return (
    `${state.quotes.length} providers ranked. Best is ${best.providerName} at ` +
    `${formatMoney(best.landedAmount, corridor.to)}, confidence ${best.confidence.replace('_', ' ')}. ` +
    `Spread across providers is ${formatBps(state.dispersionBps)}. ` +
    `${state.unavailable.length} providers could not quote.`
  );
}
